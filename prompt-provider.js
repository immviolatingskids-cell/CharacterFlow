import {MockCompiler,compilePrompt,resolveStudioState} from './studio-core.js';

export async function compilePromptPreview(state,{gemini,localCompiler=MockCompiler}={}){
  if(gemini?.compile){
    try{
      const text=await gemini.compile(resolveStudioState(state));
      if(typeof text!=='string'||!text.trim())throw new Error('Gemini returned no prompt');
      return {state:compilePrompt(state,{compile:()=>text},{provider:'gemini',model:gemini.model||'configured adapter'}),provider:'Gemini',fallbackError:null};
    }catch(error){
      return {state:compilePrompt(state,localCompiler),provider:'local',fallbackError:error};
    }
  }
  return {state:compilePrompt(state,localCompiler),provider:'local',fallbackError:null};
}
