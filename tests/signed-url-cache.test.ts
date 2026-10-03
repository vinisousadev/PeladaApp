import test from 'node:test';
import assert from 'node:assert/strict';
import {createSignedUrlCache} from '../lib/signed-url-cache';
test('Polling and concurrent requests reuse signed URLs until renewal, new photos get new URLs',async()=>{
 let time=0;const calls:string[][]=[];
 const sign=async(paths:string[])=>{calls.push(paths);return paths.map(path=>({path,signedUrl:`${path}/${calls.length}`}));};
 const cache=createSignedUrlCache(sign,3600,()=>time);
 const [a,b]=await Promise.all([cache(['a','a','b']),cache(['a'])]);
 assert.equal(calls.length,1);assert.equal(a.get('a'),b.get('a'));assert.deepEqual(calls[0],['a','b']);
 for(let i=0;i<100;i++){time+=30000;assert.equal((await cache(['a','b'])).get('a'),a.get('a'));}
 assert.equal(calls.length,1);
 await cache(['a','new-photo']);assert.deepEqual(calls[1],['new-photo']);
 time=3540000;await cache(['a']);assert.equal(calls.length,3);
 const anotherUser=createSignedUrlCache(sign,3600,()=>time);await anotherUser(['a']);assert.equal(calls.length,4);
});
test('Failed and missing signed URLs can be retried without caching errors',async()=>{
 let calls=0;
 const cache=createSignedUrlCache(async paths=>{calls++;if(calls===1)throw Error('offline');if(calls===2)return [];return paths.map(path=>({path,signedUrl:'ok'}));},900);
 await assert.rejects(cache(['a']),/offline/);
 await assert.rejects(cache(['a']),/carregar/);
 assert.equal((await cache(['a'])).get('a'),'ok');assert.equal(calls,3);
});
