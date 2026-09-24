import {createClient,type SupabaseClient} from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export function getSupabase(){if(!configured)return null;client??=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);return client;}
export function friendlyError(error:unknown){
 const e=error as {message?:string;code?:string};
 if(e.code==='23505')return 'Esse registro já existe. Atualize a página para ver os dados atuais.';
 if(e.message?.includes('Invalid login'))return 'E-mail ou senha incorretos.';
 if(e.message?.includes('Email not confirmed'))return 'Confirme seu e-mail antes de entrar.';
 if(e.message?.includes('Database error saving new user'))return 'Não foi possível cadastrar. Confira se o administrador liberou seu e-mail.';
 if(e.message?.includes('24 vagas'))return 'O elenco já tem 24 vagas preenchidas.';
 if(e.message?.includes('rate limit'))return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
 if(e.message?.includes('fetch')||e.message?.includes('network'))return 'Não foi possível conectar. Confira sua internet e tente novamente.';
 if(e.message?.includes('não está aberta'))return 'Esta pelada foi encerrada ou ainda não aconteceu. Atualize os dados.';
 if(e.code==='42501')return 'Você não tem permissão para alterar esse registro.';
 return 'Não foi possível concluir. Tente novamente; se persistir, fale com o administrador.';
}
