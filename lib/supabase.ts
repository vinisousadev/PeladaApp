import {createClient,type SupabaseClient} from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export function getSupabase(){if(!configured)return null;client??=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);return client;}
export function friendlyError(error:unknown){
 const e=error as {message?:string;code?:string};
 if(e.message?.includes('cancelamento encerrou'))return 'O prazo para cancelar terminou uma hora antes do início.';
 if(e.message?.includes('confirmações encerraram'))return 'As confirmações encerraram no início da pelada.';
 if(e.message?.includes('definir o horário'))return 'O organizador precisa definir o horário da pelada.';
 if(e.message?.includes('Confirme sua presença'))return 'Confirme a presença antes de registrar o desempenho.';
 if(e.message?.includes('após o início'))return 'Registre o desempenho somente após o início da pelada.';
 if(e.message?.includes('Já existe desempenho'))return 'Não é possível cancelar uma participação com desempenho registrado.';
 if(e.code==='PGRST205'||e.code==='PGRST202'||e.code==='42703')return 'O banco precisa da atualização de presença. Peça ao organizador para executar a migração 004.';
 if(e.code==='23505')return 'Esse registro já existe. Atualize a página para ver os dados atuais.';
 if(e.message?.includes('Invalid login'))return 'E-mail ou senha incorretos.';
 if(e.message?.includes('Email not confirmed'))return 'Confirme seu e-mail antes de entrar.';
 if(e.message?.includes('Database error saving new user'))return 'Não foi possível criar seu perfil. Avise o organizador para verificar a configuração do cadastro.';
 if(e.message?.includes('24 participantes'))return 'Esta pelada já tem 24 participantes. Você pode continuar participando de outras peladas.';
 if(e.message?.includes('rate limit'))return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
 if(e.message?.includes('fetch')||e.message?.includes('network'))return 'Não foi possível conectar. Confira sua internet e tente novamente.';
 if(e.message?.includes('não está aberta'))return 'Esta pelada foi encerrada ou ainda não aconteceu. Atualize os dados.';
 if(e.code==='42501')return 'Você não tem permissão para alterar esse registro.';
 return 'Não foi possível concluir. Tente novamente; se persistir, fale com o administrador.';
}
