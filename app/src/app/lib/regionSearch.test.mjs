import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("./regionSearch.ts",import.meta.url),"utf8");
const js=ts.transpile(source,{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020});
const module={exports:{}};vm.runInNewContext(`(function(exports,module){${js}})(module.exports,module)`,{module});
const {REGIONS,searchRegions}=module.exports;

test("전국 시군구 목록을 충분히 제공한다",()=>assert.ok(REGIONS.length>=220));
for(const [query,expected] of [["서울 강남구","서울특별시 강남구"],["서울강남구","서울특별시 강남구"],["대전 유성구","대전광역시 유성구"],["세종","세종특별자치시"],["제주 서귀포","제주특별자치도 서귀포시"],["부산 기장군","부산광역시 기장군"]]){
  test(`주소 검색: ${query}`,()=>assert.ok(searchRegions(query).includes(expected)));
}
test("존재하지 않는 지역은 결과가 없다",()=>assert.deepEqual(Array.from(searchRegions("없는시 없는구")),[]));
