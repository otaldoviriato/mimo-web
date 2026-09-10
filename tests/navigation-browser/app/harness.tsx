'use client';
import React, {useEffect, useState} from 'react';
import {usePathname, useSearchParams, useRouter} from 'next/navigation';
import {StackNavigationProvider, useStackNavigation} from '@/context/StackNavigationContext';
import {stackOverlayState, replaceStackUrl} from '@/lib/stackHistory';
function Content(){
 const {screens,basePath,initialize,pushVirtual,popVirtual}=useStackNavigation();
 const pathname=usePathname(); const search=useSearchParams(); const router=useRouter();
 const [ready,setReady]=useState(false);
 const [errors,setErrors]=useState<string[]>([]);
 useEffect(()=>{let cancelled=false;queueMicrotask(()=>{if(!cancelled){initialize(location.pathname+location.search+location.hash);setReady(true)}});return()=>{cancelled=true}},[pathname,search,initialize]);
 useEffect(()=>{const onError=(e:ErrorEvent)=>setErrors(x=>[...x,e.message]);window.addEventListener('error',onError);return()=>window.removeEventListener('error',onError)},[]);
 const top=screens[screens.length-1];
 return <main><h1>Mimo — Navigation integration test</h1><p>Real Next.js 16 + production stack provider, isolated from accounts and APIs.</p>
 <p id="url">URL: {pathname}</p><p id="base">Base: {basePath||pathname}</p>
 <h2 id="visible">{!ready?'Preparing':top?.type || basePath || pathname}</h2>
 <pre id="stack">{JSON.stringify(screens.map(s=>({type:s.type,key:s.key,closing:!!s.isClosing,animate:!!s.animate,mounted:!!s.mounted})),null,2)}</pre>
 <button onClick={()=>pushVirtual('chat',{userId:'ana',username:'ana'})}>Open chat</button>{' '}
 <button onClick={()=>pushVirtual('chatInfo',{userId:'ana',username:'ana'})}>Open info</button>{' '}
 <button onClick={popVirtual}>App back</button>{' '}
 <button onClick={()=>history.back()}>Browser history back</button>{' '}
 <button onClick={()=>history.forward()}>Forward</button>{' '}
 <button onClick={()=>history.go(-2)}>Back two</button>{' '}
 <button onClick={()=>location.reload()}>Reload</button>{' '}
 <button onClick={()=>router.push('/search')}>Next search tab</button>{' '}
 <button onClick={()=>history.pushState(stackOverlayState({mimoViewerOpen:true}),'')}>Open overlay</button>{' '}
 <button onClick={()=>replaceStackUrl('/chat/ana?source=test')}>Canonical URL</button>
 <p id="document">{ready ? `Document: ${performance.timeOrigin}; history entries: ${history.length}` : ""}</p><p id="errors">Errors: {errors.join(', ')||'none'}</p>
 </main>
}
export default function Harness({children}: {children?: React.ReactNode}){return <StackNavigationProvider><Content/>{children}</StackNavigationProvider>}
