import {switchCharacter} from './character-library.js';

export const PROJECT_LIBRARY_SCHEMA_VERSION=1;
const clone=value=>structuredClone(value);
const unique=values=>[...new Set((values||[]).filter(Boolean))];
const makeId=()=>`project_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const timestamp=()=>new Date().toISOString();

export function normalizeProject(project={},state={}){
  const availableCharacterIds=new Set((state.characters||[]).map(character=>character.id));
  const takesById=new Map((state.takes||[]).map(take=>[take.id,take]));
  const takeIds=unique(project.takeIds).filter(id=>{const take=takesById.get(id);return take&&availableCharacterIds.has(take.characterId)});
  const owningCharacterIds=takeIds.map(id=>takesById.get(id).characterId);
  const characterIds=unique([...unique(project.characterIds).filter(id=>availableCharacterIds.has(id)),...owningCharacterIds]);
  return {id:project.id||makeId(),name:String(project.name||'Untitled Project'),brief:String(project.brief||''),status:project.status==='archived'?'archived':'active',characterIds,takeIds,direction:{notes:String(project.direction?.notes||''),sceneIntent:String(project.direction?.sceneIntent||''),styleIntent:String(project.direction?.styleIntent||'')},createdAt:project.createdAt||timestamp(),updatedAt:project.updatedAt||project.createdAt||timestamp()};
}

export function migrateProjectState(state={}){const projects=(Array.isArray(state.projects)?state.projects:[]).map(project=>normalizeProject(project,state));const activeProjectId=projects.some(project=>project.id===state.activeProjectId)?state.activeProjectId:null;return {...state,projects,activeProjectId};}

export function createProject(state,input={},options={}){const now=options.now||timestamp(),project=normalizeProject({...input,id:input.id||options.id||makeId(),createdAt:now,updatedAt:now},state);return {...state,projects:[...(state.projects||[]),project],activeProjectId:project.id,dirty:true};}
export function updateProject(state,projectId,changes={},options={}){const now=options.now||timestamp();return {...state,projects:(state.projects||[]).map(project=>project.id===projectId?normalizeProject({...project,...clone(changes),id:project.id,createdAt:project.createdAt,updatedAt:now},state):project),dirty:true};}
export const archiveProject=(state,projectId,archived=true,options={})=>updateProject(state,projectId,{status:archived?'archived':'active'},options);
export function deleteProject(state,projectId){return {...state,projects:(state.projects||[]).filter(project=>project.id!==projectId),activeProjectId:state.activeProjectId===projectId?null:state.activeProjectId,dirty:true};}
export const attachCharacter=(state,projectId,characterId,options={})=>updateProject(state,projectId,{characterIds:unique([...(state.projects||[]).find(project=>project.id===projectId)?.characterIds||[],characterId])},options);
export function detachCharacter(state,projectId,characterId,options={}){const project=(state.projects||[]).find(item=>item.id===projectId);if(!project)return state;const ownedTakeIds=new Set((state.takes||[]).filter(take=>take.characterId===characterId).map(take=>take.id));return updateProject(state,projectId,{characterIds:(project.characterIds||[]).filter(id=>id!==characterId),takeIds:(project.takeIds||[]).filter(id=>!ownedTakeIds.has(id))},options)}
export function attachTake(state,projectId,takeId,options={}){const project=(state.projects||[]).find(item=>item.id===projectId),take=(state.takes||[]).find(item=>item.id===takeId);if(!project||!take||(state.characters||[]).every(character=>character.id!==take.characterId))return state;return updateProject(state,projectId,{characterIds:unique([...(project.characterIds||[]),take.characterId]),takeIds:unique([...(project.takeIds||[]),takeId])},options)}
export const detachTake=(state,projectId,takeId,options={})=>updateProject(state,projectId,{takeIds:((state.projects||[]).find(project=>project.id===projectId)?.takeIds||[]).filter(id=>id!==takeId)},options);
export function openProjectCharacter(state,projectId,characterId){if(characterId===undefined){characterId=projectId;projectId=state.activeProjectId}const project=(state.projects||[]).find(item=>item.id===projectId);if(!project?.characterIds.includes(characterId))return state;return switchCharacter(state,characterId);}
export function openProjectTake(state,projectId,takeId){if(takeId===undefined){takeId=projectId;projectId=state.activeProjectId}const project=(state.projects||[]).find(item=>item.id===projectId);if(!project?.takeIds.includes(takeId))return state;const take=(state.takes||[]).find(item=>item.id===takeId);if(!take)return state;const switched=switchCharacter(state,take.characterId);if(switched.activeCharacterId!==take.characterId)return state;return {...switched,selectedTake:take.id,dirty:false};}
