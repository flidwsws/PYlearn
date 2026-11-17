// Check all reference solutions against the same Python runner used by the worker.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {tasks,modules,legacyIdMap} from '../dist/data.js';
import {normalizeProgress,nextTaskId,isUnlocked} from '../dist/progress.js';

assert.equal(tasks.length,40);
assert.equal(modules.length,7);
assert.equal(tasks.filter(t=>t.module===1).length,10);
for(const m of modules)assert.ok(tasks.filter(t=>t.module===m.id).length>=5);
const original=normalizeProgress({completed:Array.from({length:30},(_,i)=>i),drafts:{15:'loop draft',25:'function draft'},solutions:[29]});
assert.equal(original.completed.length,30,'Migration preserves every completed task');
assert.equal(original.drafts[legacyIdMap[15]],'loop draft');
assert.equal(original.drafts[legacyIdMap[25]],'function draft');
assert.deepEqual(original.solutions,[legacyIdMap[29]]);
assert.equal(nextTaskId(original),5,'New simple-type tasks unlock first');
assert.equal(isUnlocked(original,legacyIdMap[25]),true,'Old solved tasks remain reviewable');
assert.equal(isUnlocked(original,20),false,'New import module waits for earlier gaps');
assert.equal(normalizeProgress(original).completed.length,30,'Migration is idempotent');
assert.deepEqual(normalizeProgress({version:2,completed:[-1,40,'1',1,1,0]}).completed,[0,1]);
let runner;
const context={
  importScripts(){},
  loadPyodide:async()=>({runPython(code){runner=code;}}),
  self:{postMessage(){}},
};
vm.runInNewContext(readFileSync(new URL('../dist/python-worker.js',import.meta.url),'utf8'),context);
await new Promise(resolve=>setImmediate(resolve));
assert.ok(runner,'Python runner was not initialized');
const payloads=tasks.map(t=>({code:t.solution,mode:'check',tests:t.tests,required:t.required,syntax:t.syntax}));
const cases=[
  {code:'print("не тот ответ")',mode:'check',tests:tasks[0].tests,expect:false,label:'Reject wrong output'},
  {code:'print("Привет, Аня!")',mode:'check',tests:tasks[4].tests,expect:false,label:'Reject hardcoded input'},
  {code:'def is_even(n):\n    return "True"',mode:'check',tests:tasks.find(t=>t.legacyId===27).tests,expect:false,label:'Reject string instead of boolean'},
  {code:'print(1)\nprint(2)\nprint(3)\nprint(4)\nprint(5)',mode:'check',tests:tasks.find(t=>t.legacyId===15).tests,syntax:'loop',expect:false,label:'Require loop'},
  {code:'print(1 / 0)',mode:'run',expect:false,label:'Report runtime error'},
  {code:'print("x" * 17000)',mode:'run',expect:false,label:'Bound output size'},
  {code:'print(input())\nprint(input())',input:'one',mode:'run',expect:false,label:'Report exhausted input'},
  {code:'print("test")',mode:'run',expect:true,label:'Run without test suite'},
];
const script=runner+`\n_checks = _json.loads(input())\nfor _i, _check in enumerate(_checks):\n    _result = _json.loads(_execute_payload(_json.dumps(_check)))\n    _expected_pass = _check.get("expect", True)\n    if _result["passed"] != _expected_pass:\n        print(_json.dumps({"index": _i, "result": _result}, ensure_ascii=False))\n        raise SystemExit(1)\nprint("Verified 40 reference solutions, 8 runner cases and legacy progress migration.")\n`;
const result=spawnSync(process.env.PYTHON||'python3',['-c',script],{input:JSON.stringify([...payloads,...cases]),encoding:'utf8',timeout:20000});
if(result.error)throw result.error;
if(result.status!==0){console.error(result.stdout,result.stderr);process.exit(1);}
console.log(result.stdout.trim());
