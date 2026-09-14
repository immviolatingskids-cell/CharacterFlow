import {switchCharacter} from './character-library.js';

export const PROJECT_LIBRARY_SCHEMA_VERSION=1;
const clone=value=>structuredClone(value);
const unique=values=>[...new Set((values||[]).filter(Boolean))];
const makeId=()=>`project_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const timestamp=()=>new Date().toISOString();

export function normalizeProject(project={},state={}){
  const characterIds=new Set((state.characters||[]).map(character=>character.id));
  const takeIds=new Set((state.takes||[]).map(take=>take.id));
  return {id:project.id||makeId(),name:String(project.name||'Untitled Project'),brief:String(project.brief||''),status:project.status==='archived'?'archived':'active',characterIds:unique(project.characterIds).filter(id=>characterIds.has(id)),takeIds:unique(project.takeIds).filter(id=>takeIds.has(id)),direction:{notes:String(project.direction?.notes||''),sceneIntent:String(project.direction?.sceneIntent||''),styleIntent:String(project.direction?.styleIntent||'')},createdAt:project.createdAt||timestamp(),updatedAt:project.updatedAt||project.createdAt||timestamp()};
}

export function migrateProjectState(state={}){const projects=(Array.isArray(state.projects)?state.projects:[]).map(project=>normalizeProject(project,state));const activeProjectId=projects.some(project=>project.id===state.activeProjectId)?state.activeProjectId:null;return {...state,projects,activeProjectId};}

export function createProject(state,input={},options={}){const now=options.now||timestamp(),project=normalizeProject({...input,id:input.id||options.id||makeId(),createdAt:now,updatedAt:now},state);return {...state,projects:[...(state.projects||[]),project],activeProjectId:project.id,dirty:true};}
export function updateProject(state,projectId,changes={},options={}){const now=options.now||timestamp();return {...state,projects:(state.projects||[]).map(project=>project.id===projectId?normalizeProject({...project,...clone(changes),id:project.id,createdAt:project.createdAt,updatedAt:now},state):project),dirty:true};}
export const archiveProject=(state,projectId,archived=true,options={})=>updateProject(state,projectId,{status:archived?'archived':'active'},options);
export function deleteProject(state,projectId){return {...state,projects:(state.projects||[]).filter(project=>project.id!==projectId),activeProjectId:state.activeProjectId===projectId?null:state.activeProjectId,dirty:true};}
export const attachCharacter=(state,projectId,characterId,options={})=>updateProject(state,projectId,{characterIds:unique([...(state.projects||[]).find(project=>project.id===projectId)?.characterIds||[],characterId])},options);
export const detachCharacter=(state,projectId,characterId,options={})=>updateProject(state,projectId,{characterIds:((state.projects||[]).find(project=>project.id===projectId)?.characterIds||[]).filter(id=>id!==characterId)},options);
export const attachTake=(state,projectId,takeId,options={})=>updateProject(state,projectId,{takeIds:unique([...(state.projects||[]).find(project=>project.id===projectId)?.takeIds||[],takeId])},options);
export const detachTake=(state,projectId,takeId,options={})=>updateProject(state,projectId,{takeIds:((state.projects||[]).find(project=>project.id===projectId)?.takeIds||[]).filter(id=>id!==takeId)},options);
export function openProjectCharacter(state,projectId,characterId){if(characterId===undefined){characterId=projectId;projectId=state.activeProjectId}const project=(state.projects||[]).find(item=>item.id===projectId);if(!project?.characterIds.includes(characterId))return state;return switchCharacter(state,characterId);}
export function openProjectTake(state,projectId,takeId){if(takeId===undefined){takeId=projectId;projectId=state.activeProjectId}const project=(state.projects||[]).find(item=>item.id===projectId);if(!project?.takeIds.includes(takeId))return state;const take=(state.takes||[]).find(item=>item.id===takeId);if(!take)return state;const switched=switchCharacter(state,take.characterId);if(switched.activeCharacterId!==take.characterId)return state;return {...switched,selectedTake:take.id,dirty:false};}
