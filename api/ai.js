export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Método não permitido"});
 if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:"OPENAI_API_KEY não configurada"});
 try{
  const {mode="food",message="",image=null,context={}}=req.body||{};
  const foodPrompt=`Você é a IA do app Meu Ritmo, um assistente pessoal de alimentação. Responda em português do Brasil, curto, prático e sem julgamento. Meta diária: 1700-1900 kcal e 130-150g proteína. Peso atual 94,8kg; meta 90kg. Regra essencial: só marque consumed=true quando o usuário disser que comeu/tomou/bebeu/adicionou ou a mensagem inequivocamente relatar consumo. Perguntas como "posso comer?", "quantas calorias?", "estou pensando" NÃO registram. Se houver foto, estime alimentos, porções, kcal e proteína, deixando claro que é estimativa. Retorne SOMENTE JSON válido neste formato: {"reply":"texto","consumed":false,"items":[{"name":"alimento","kcal":0,"protein":0}],"confidence":"alta|media|baixa"}. Contexto do dia: ${JSON.stringify(context)}.`;
  const trainPrompt=`Você é a IA de treino do app Meu Ritmo. Usuário: homem, 33 anos, 1,78m, 94,8kg, meta 90kg, trabalho sedentário, academia 3x/semana ~30 min, natação 1x/semana, foco atual em peito e costas e também postura. Monte ou ajuste treino simples, realista, sem diagnosticar lesões. Se houver dor, recomende interromper o exercício doloroso e avaliação profissional quando apropriado. Retorne SOMENTE JSON válido: {"reply":"resumo","focus":"foco","days":[{"title":"Treino A","exercises":[{"name":"exercício","sets":"3","reps":"8-12","note":"nota curta"}]}]}. Contexto: ${JSON.stringify(context)}.`;
  const content=[{type:"input_text",text:(mode==="training"?trainPrompt:foodPrompt)+"\nMensagem do usuário: "+message}];
  if(image) content.push({type:"input_image",image_url:image});
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:"gpt-5.6-luna",input:[{role:"user",content}],max_output_tokens:1200})});
  const data=await r.json(); if(!r.ok) return res.status(r.status).json({error:data?.error?.message||"Erro na OpenAI"});
  let text=data.output_text||""; if(!text){for(const o of data.output||[])for(const c of o.content||[])if(c.type==="output_text")text+=c.text||""}
  text=text.trim().replace(/^\`\`\`json\s*/i,"").replace(/\`\`\`$/,"").trim();
  try{return res.status(200).json(JSON.parse(text))}catch{return res.status(200).json({reply:text,consumed:false,items:[],confidence:"baixa"})}
 }catch(e){return res.status(500).json({error:"Falha na IA: "+e.message})}
}