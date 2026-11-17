/* Real CPython in a dedicated worker. The UI can stop long-running programs. */
const BASE = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';
let engine;
const boot = (async () => {
  try {
    importScripts(BASE + 'pyodide.js');
    engine = await loadPyodide({indexURL: BASE});
    engine.runPython(`
import ast as _ast
import contextlib as _contextlib
import io as _io
import json as _json
import traceback as _traceback
import builtins as _builtins

class _LimitedOutput(_io.StringIO):
    def write(self, text):
        if self.tell() + len(text) > 16000:
            raise RuntimeError("Слишком много вывода. Проверь условие завершения цикла.")
        return super().write(text)

def _execute_payload(raw):
    payload = _json.loads(raw)
    code = payload["code"]
    tests = payload.get("tests", []) if payload["mode"] == "check" else [{"input": payload.get("input", "")}]
    results = []
    for test in tests:
        output = _LimitedOutput()
        ns = {"__name__": "__main__"}
        inputs = iter(test.get("input", "").split("\\n"))
        local_builtins = dict(vars(_builtins))
        def read_input(prompt=""):
            try:
                return next(inputs)
            except StopIteration:
                raise EOFError("Входные данные закончились. Добавь значения в поле ввода.") from None
        local_builtins["input"] = read_input
        ns["__builtins__"] = local_builtins
        error = None
        actual = None
        passed = True
        try:
            with _contextlib.redirect_stdout(output), _contextlib.redirect_stderr(output):
                exec(compile(code, "main.py", "exec"), ns)
                if "expr" in test:
                    actual = eval(test["expr"], ns)
                    expected = test["expected"]
                    passed = actual == expected and (not isinstance(expected, bool) or isinstance(actual, bool))
                    actual = repr(actual)
                else:
                    actual = output.getvalue().replace("\\r\\n", "\\n").rstrip()
                    if "expected" in test:
                        passed = actual == test["expected"].rstrip()
                if passed and payload.get("required"):
                    passed = bool(eval(payload["required"], {"ns": ns}))
                    if not passed:
                        error = "Проверь переменные из условия задачи."
                if passed and payload.get("syntax") == "loop":
                    passed = any(isinstance(node, (_ast.For, _ast.While)) for node in _ast.walk(_ast.parse(code)))
                    if not passed:
                        error = "В этой задаче нужно использовать цикл for или while."
        except Exception as exc:
            passed = False
            trace = _traceback.extract_tb(exc.__traceback__)
            lines = [frame.lineno for frame in trace if frame.filename == "main.py"]
            lineno = getattr(exc, "lineno", None) or (lines[-1] if lines else None)
            error = ("Строка " + str(lineno) + ": " if lineno else "") + type(exc).__name__ + ": " + str(exc)
        results.append({"passed": passed, "actual": actual, "output": output.getvalue(), "error": error, "expected": test.get("expected"), "input": test.get("input", ""), "label": test.get("label")})
    return _json.dumps({"results": results, "passed": all(r["passed"] for r in results)}, ensure_ascii=False)
`);
    self.postMessage({type:'ready'});
  } catch (error) {
    self.postMessage({type:'init-error',error:String(error)});
    throw error;
  }
})();
// Prevent a rejected boot promise from becoming an unhandled rejection.
boot.catch(()=>{});
self.onmessage = async ({data}) => {
  if(data.type !== 'execute') return;
  try {
    await boot;
    engine.globals.set('_payload_json', JSON.stringify(data.payload));
    const result = JSON.parse(engine.runPython('_execute_payload(_payload_json)'));
    self.postMessage({type:'result',id:data.id,...result});
  } catch(error) {
    self.postMessage({type:'error',id:data.id,error:String(error)});
  }
};
