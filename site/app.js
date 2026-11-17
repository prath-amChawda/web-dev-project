const form=document.querySelector('#scan-form');
const report=document.querySelector('#report');
const file=document.querySelector('#file');
const count=document.querySelector('#char-count');
const button=document.querySelector('#submit');
const placeholder=document.querySelector('#placeholder');
const summary=document.querySelector('#summary');
const preferencePanel=document.querySelector('#preference-panel');
const dietButton=document.querySelector('#diet-button');
const dietResult=document.querySelector('#diet-result');
const reviewBox=document.querySelector('#review-box');
const limitsBox=document.querySelector('#limits-box');
const foodQuestion=document.querySelector('#food-question');
const foodAnswer=document.querySelector('#food-answer');
const scanStatus=document.querySelector('#scan-status');
let scannedText='';
let selectedImage=null;
let lastResults=[];
let selectedPreference='';

report.addEventListener('input',()=>{count.textContent=`${report.value.length.toLocaleString()} / 100,000`;if(report.value.trim())selectedImage=null;});
file.addEventListener('change',async()=>{
  const selected=file.files[0];
  if(!selected)return;
  try{
    document.querySelector('#filename').textContent=selected.name;
    if(selected.type.startsWith('image/')){
      if(selected.size>10_000_000)throw new Error('Please choose an image smaller than 10 MB.');
      selectedImage=selected;report.value='';count.textContent='0 / 100,000';
    }else{selectedImage=null;report.value=await selected.text();report.dispatchEvent(new Event('input'));}
    scanStatus.hidden=true;
  }catch(error){scanStatus.textContent=error.message;scanStatus.hidden=false;file.value='';selectedImage=null;}
});
function addText(parent,tag,className,text){const node=document.createElement(tag);node.className=className;node.textContent=text;parent.append(node);return node;}
function isOutside(item){return item.status.startsWith('Above the range')||item.status.startsWith('Below the range');}
function renderReview(results){
  reviewBox.replaceChildren();
  addText(reviewBox,'h3','', 'Report flags to discuss');
  const flags=results.filter(isOutside);
  const noRange=results.filter(item=>item.status==='Needs clinician review');
  if(flags.length){
    for(const item of flags)addText(reviewBox,'p','review-row',`${item.name}: ${item.value} ${item.unit||''} — ${item.status.toLowerCase()}`);
    addText(reviewBox,'small','','These are out-of-range results, not disease diagnoses. Many factors affect test results; ask a clinician what they mean for you.');
  }else if(results.length&&noRange.length===0){
    addText(reviewBox,'p','','No checked value was outside its readable report range. This does not prove that a person is healthy.');
  }else{
    addText(reviewBox,'p','','No out-of-range result was confirmed. Some values had no readable range, so ask a clinician to review the report.');
  }
  reviewBox.hidden=false;
  limitsBox.replaceChildren();addText(limitsBox,'h3','','Foods or drinks to limit');
  const highGlucose=flags.some(x=>/glucose|a1c|hba1c/i.test(x.name)&&x.status.startsWith('Above'));
  const highLipids=flags.some(x=>/cholesterol|\bldl\b|triglyceride/i.test(x.name)&&x.status.startsWith('Above'));
  let any=false;
  if(highGlucose){any=true;const p=addText(limitsBox,'p','food-limit-item','Sugary drinks (soft drinks, sweetened tea/coffee) and frequent sweets such as mithai: consider limiting these. This is not a ban; discuss suitable portions with your clinician.');p.className='food-limit-item';}
  if(highLipids){any=true;const p=addText(limitsBox,'p','food-limit-item','Foods high in saturated fat (for example, butter/ghee-heavy foods) and frequent deep-fried snacks: consider limiting them. Ask your clinician how this fits your overall lipid results.');p.className='food-limit-item';}
  if(!any)addText(limitsBox,'p','','This report does not support a specific avoid list. The app will not guess food restrictions from other test results.');
  addText(limitsBox,'small','', '“Limit” does not mean “never eat.” Do not make major diet changes from this screen alone.');
  limitsBox.hidden=false;
}
function send(text,preference=''){
  if(!text.trim())throw new Error('Choose a report image or paste readable report text first.');
  const rows=[];
  const lines=text.split(/\r?\n/);
  const definitions=[
    {name:'HbA1c',re:/\b(?:HbA1c|A1C|glycated\s+haemoglobin|glycated\s+hemoglobin)\b/i,unit:'%',more:'Include vegetables, pulses, and whole grains in balanced meals.',limit:'Limit sugar-sweetened drinks; ask a clinician about portions and carbohydrate choices.',note:'Do not change medicines based on this result.'},
    {name:'Fasting glucose',re:/\b(?:fasting\s+)?(?:blood\s+)?glucose\b/i,unit:'mg/dL',more:'Choose high-fibre foods such as vegetables, pulses, and whole grains.',limit:'Limit sugar-sweetened drinks; ask a clinician how this result fits your health history.',note:'A single glucose result cannot diagnose a condition by itself.'},
    {name:'Total cholesterol',re:/\btotal\s+cholesterol\b/i,unit:'mg/dL',more:'Include vegetables, fruit, pulses, and whole grains in a varied eating pattern.',limit:'Limit foods high in saturated or trans fats.',note:'A clinician should review the full lipid profile and overall risk.'}
  ];
  const rangeRe=/(?:reference|ref\.?\s*range|normal\s*range)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(\d+(?:\.\d+)?)/i;
  function addResult(name,value,unit,line,more,limit,note){
    const range=line.match(rangeRe);let status='Needs clinician review';
    if(range){const n=Number(value),low=Number(range[1]),high=Number(range[2]);status=n<low?'Below the range printed on this report':n>high?'Above the range printed on this report':'Within the range printed on this report';}
    if(!rows.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.value===value))rows.push({name,value,unit,status,more,limit,note});
  }
  for(const line of lines){
    for(const def of definitions){
      const marker=def.re.exec(line);if(!marker)continue;
      const valueRe=new RegExp('^\\s*[:=]?\\s*([<>≤≥]?)\\s*(-?\\d+(?:\\.\\d+)?)\\s*(%|mg\\s*/\\s*dL|mmol\\s*/\\s*L)?','i');
      const value=line.slice(marker.index+marker[0].length).match(valueRe);
      if(value)addResult(def.name,value[2],(value[3]||def.unit).replace(/\s/g,''),line,def.more,def.limit,def.note);
    }
    const generic=/^\s*([A-Za-z][A-Za-z0-9()/ %.,_-]{1,55}?)\s*:\s*([<>≤≥]?)\s*(-?\d+(?:\.\d+)?)\s*([A-Za-z%µμ/0-9^.-]*)/i;
    const table=/^\s*([A-Za-z][A-Za-z0-9()/ %.,_-]{1,55}?)\s{2,}([<>≤≥]?)\s*(-?\d+(?:\.\d+)?)\s*([A-Za-z%µμ/0-9^.-]*)/i;
    const match=line.match(generic)||line.match(table);if(!match)continue;
    const name=match[1].replace(/\s+/g,' ').trim();
    if(/\b(date|time|patient|report|specimen|accession|collected|received|page|phone|address|age|sex|gender|reference|normal range|lab no|sample id)\b/i.test(name))continue;
    if(definitions.some(d=>d.re.test(name)))continue;
    addResult(name,match[3],(match[4]||'').replace(/\s/g,''),line,'No test-specific food advice is provided for this result.','Do not remove foods or change your diet based on this value alone.','Ask a qualified clinician to interpret this test in context.');
  }
  const allInRange=rows.length>0&&rows.every(x=>x.status.startsWith('Within the range'));
  const rangeMessage=allInRange?'All detected values with readable reference ranges are within the ranges printed on this report. This does not confirm that a person is healthy.':'Some values need clinician review, or no readable reference range was found. This tool cannot determine whether a person is healthy.';
  let diet;
  if(preference==='vegetarian')diet={label:'Vegetarian sample day',meals:[
    {meal:'Breakfast',food:'Oats or daliya with apple',description:'Whole grains provide fibre; choose plain oats and add fruit for flavour.'},
    {meal:'Lunch',food:'Dal, vegetables, and roti or rice',description:'Dal adds plant protein. Add a serving of vegetables alongside your usual grain.'},
    {meal:'Snack',food:'Plain yoghurt or a handful of nuts',description:'A simple snack option; choose portions that suit your needs.'},
    {meal:'Dinner',food:'Tofu or paneer with vegetables',description:'Cook with modest added oil and serve with roti or rice.'}
  ],limit:'No food is automatically forbidden by this demo. Confirm personal restrictions with a clinician.'};
  else if(preference==='non-vegetarian')diet={label:'Non-vegetarian sample day',meals:[
    {meal:'Breakfast',food:'Egg with whole-wheat roti and vegetables',description:'Egg provides protein; vegetables add colour and fibre to the meal.'},
    {meal:'Lunch',food:'Fish or chicken, vegetables, and rice or roti',description:'Choose a grilled or lightly cooked preparation when possible.'},
    {meal:'Snack',food:'Apple or plain yoghurt',description:'A simple snack idea; choose portions that suit your needs.'},
    {meal:'Dinner',food:'Dal, vegetables, and egg or fish',description:'Dal adds plant protein; use the animal protein you normally eat and enjoy.'}
  ],limit:'No food is automatically forbidden by this demo. Confirm personal restrictions with a clinician.'};
  return {results:rows,allInRange,rangeMessage,extractedText:text,diet};
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  button.disabled=true;
  button.textContent='Reading…';scanStatus.textContent='';scanStatus.hidden=true;
  preferencePanel.hidden=true;dietResult.hidden=true;foodQuestion.hidden=true;reviewBox.hidden=true;limitsBox.hidden=true;
  try{
    scannedText=report.value;
    if(selectedImage){
      if(!window.Tesseract)throw new Error('Image OCR could not load. Connect to the internet and reload this page.');
      scanStatus.hidden=false;scanStatus.textContent='Loading browser OCR… The first image may take a little longer.';
      const worker=await Tesseract.createWorker('eng',1,{logger:message=>{if(message.status==='recognizing text')scanStatus.textContent=`Reading image text… ${Math.round(message.progress*100)}%`;}});
      try{const recognized=await worker.recognize(selectedImage);scannedText=recognized.data.text;}finally{await worker.terminate();}
      if(!scannedText.trim())throw new Error('No readable text found. Try a clearer image with better lighting.');
    }
    const data=await send(scannedText);
    scannedText=data.extractedText;
    lastResults=data.results;
    summary.replaceChildren();
    addText(summary,'p',data.allInRange?'range-good':'summary-notice',data.rangeMessage);
    if(data.results.length===0){addText(summary,'p','no-results','No supported values were confidently recognized. Check the pasted text and ask a clinician to interpret the full report.');}
    for(const item of data.results){
      const row=document.createElement('article');row.className='result-row';
      const head=document.createElement('div');head.className='result-head';
      addText(head,'h3','',item.name);addText(head,'span','result-value',`${item.value} ${item.unit}`);row.append(head);
      addText(row,'div','result-status',item.status);
      summary.append(row);
    }
    placeholder.hidden=true;summary.hidden=false;
    renderReview(lastResults);
    if(scannedText.trim())preferencePanel.hidden=false;
    dietResult.hidden=true;
    scanStatus.textContent=selectedImage?'Image read in your browser. Check every extracted result against the original report.':'Report text read.';scanStatus.hidden=false;
  }catch(error){scanStatus.textContent=error.message;scanStatus.hidden=false;}
  finally{button.disabled=false;button.innerHTML='Read report <span aria-hidden="true">→</span>';}
});
document.querySelectorAll('input[name="preference"]').forEach(input=>input.addEventListener('change',()=>dietButton.disabled=false));
dietButton.addEventListener('click',async()=>{
  const preference=document.querySelector('input[name="preference"]:checked')?.value;
  if(!preference)return;
  selectedPreference=preference;
  dietButton.disabled=true;dietButton.textContent='Preparing…';
  try{
    const data=await send(scannedText,preference);
    dietResult.replaceChildren();
    addText(dietResult,'h3','',data.diet.label+' · general sample');
    for(const item of data.diet.meals){
      const row=document.createElement('div');row.className='meal-card';
      addText(row,'div','meal-name',item.meal);
      addText(row,'div','meal-food',item.food);
      addText(row,'p','meal-description',item.description);
      dietResult.append(row);
    }
    addText(dietResult,'p','diet-limit',data.diet.limit);
    addText(dietResult,'p','result-note','This is a general example, not a personalized treatment plan. Ask a clinician or dietitian to adapt it to allergies, medicines, culture, and other health needs.');
    const sources=document.createElement('p');sources.className='sources';sources.append(document.createTextNode('General guidance: '));
    const who=document.createElement('a');who.href='https://www.who.int/news-room/fact-sheets/detail/healthy-diet';who.target='_blank';who.rel='noreferrer';who.textContent='WHO healthy diet';
    const niddk=document.createElement('a');niddk.href='https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/diabetes-nutrition-counseling';niddk.target='_blank';niddk.rel='noreferrer';niddk.textContent='NIDDK meal planning';
    sources.append(who,document.createTextNode(' · '),niddk);dietResult.append(sources);
    dietResult.hidden=false;
    foodQuestion.hidden=false;foodAnswer.hidden=true;
  }catch(error){alert(error.message);}
  finally{dietButton.disabled=false;dietButton.innerHTML='Show sample menu <span aria-hidden="true">→</span>';}
});

document.querySelector('#question-form').addEventListener('submit',event=>{
  event.preventDefault();
  const question=document.querySelector('#food-input').value.trim().toLowerCase();
  if(!question)return;
  let kind='answer-alert';let answer='I can’t reliably tell whether that food is suitable for you from this report. Allergies, medicines, diagnosis, and personal instructions matter. Please ask your clinician or dietitian.';
  const highGlucose=lastResults.some(x=>/glucose|a1c|hba1c/i.test(x.name)&&x.status.startsWith('Above'));
  const highLipids=lastResults.some(x=>/cholesterol|\bldl\b|triglyceride/i.test(x.name)&&x.status.startsWith('Above'));
  if(/apple|fruit|orange|berries/.test(question)){
    kind='answer-ok';answer='Whole fruit such as an apple can fit a varied eating pattern for many people. This report cannot set your personal portion. If you have an allergy or a clinician gave you a specific food plan, follow that advice.';
    if(highGlucose)answer+=' Your report includes a glucose-related value above its printed range; ask your clinician how fruit portions fit your care plan.';
  }else if(/dal|lentil|beans|vegetable|spinach|oat|whole.?grain|roti/.test(question)){
    kind='answer-ok';answer='This food can fit many balanced eating patterns. Your report alone cannot determine your personal portion or whether it suits other health needs.';
  }else if(/soda|soft drink|sweetened tea|sweet tea|sweet|mithai|candy|sugary drink|juice/.test(question)){
    kind='answer-alert';answer='Frequent sugary drinks and sweets are commonly limited in general healthy eating guidance; that does not mean they are automatically forbidden. Choose water or unsweetened drinks more often and ask your clinician for personal advice.';
    if(highGlucose)answer+=' A glucose-related result is above the report range, so discuss this with your clinician.';
  }else if(/ghee|butter|fried|chips|fatty meat|processed meat|sausage/.test(question)){
    kind='answer-alert';answer='Foods high in saturated fat or frequent deep-fried/processed foods are often limited in general heart-healthy eating guidance. The report does not prove you must stop this food.';
    if(highLipids)answer+=' A lipid-related result is above the report range; ask your clinician about your full lipid profile.';
  }else if(/egg|fish|chicken|paneer|tofu|yoghurt|yogurt|milk|rice/.test(question)){
    kind='answer-ok';answer=`${selectedPreference==='vegetarian'&&/egg|fish|chicken/.test(question)?'You selected vegetarian, so this item is not included in the sample menu. ':''}This food may fit some people's eating patterns, but the report alone cannot decide what is right for you. Follow any clinician advice or allergy restrictions.`;
  }
  foodAnswer.className=`food-answer ${kind}`;foodAnswer.textContent=answer;foodAnswer.hidden=false;
});

