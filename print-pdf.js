/* Build a printable PDF locally. Text is drawn with the device's Chinese fonts,
   so the PDF remains readable without an external font or network request. */
(function(root){
 'use strict';
 function ascii(text){return Uint8Array.from(text,c=>c.charCodeAt(0)&255)}
 function makePDF(images){
  const chunks=[],offsets=[0];let size=0;
  const add=part=>{part=typeof part==='string'?ascii(part):part;chunks.push(part);size+=part.length};
  const object=(id,body)=>{offsets[id]=size;add(`${id} 0 obj\n`);add(body);add('\nendobj\n')};
  const stream=(id,dict,bytes)=>{offsets[id]=size;add(`${id} 0 obj\n<< ${dict} /Length ${bytes.length} >>\nstream\n`);add(bytes);add('\nendstream\nendobj\n')};
  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>(3+i*3)+' 0 R').join(' ')}] >>`);
  images.forEach((im,i)=>{
   const page=3+i*3,image=page+1,content=page+2;
   object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`);
   stream(image,`/Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,im.bytes);
   stream(content,'',ascii('q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n'));
  });
  const xref=size;add(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for(let i=1;i<offsets.length;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  add(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks,{type:'application/pdf'});
 }
 root.createWordListPDF=async function(model,words,onProgress){
  const images=[],CW=1240,CH=1754,M=66,BOTTOM=CH-70;
  const columns=[M,M+54,M+354,CW-M-93,CW-M];
  let canvas,ctx,y,pageNo=0;const imageCache=new Map();
  const font=(size=20,weight='normal')=>{ctx.font=`${weight} ${size}px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",Arial,sans-serif`;ctx.fillStyle='#222'};
  function wrap(text,maxWidth,size=20){
   font(size);const lines=[];let line='';
   for(const char of String(text)){if(char==='\n'){lines.push(line);line='';continue}if(line&&ctx.measureText(line+char).width>maxWidth){lines.push(line);line=char}else line+=char}
   if(line)lines.push(line);return lines.length?lines:[''];
  }
  function line(x1,y1,x2,y2){ctx.beginPath();ctx.strokeStyle='#c9c9c9';ctx.lineWidth=1;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function start(){
   pageNo++;canvas=document.createElement('canvas');canvas.width=CW;canvas.height=CH;ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器无法生成PDF');ctx.fillStyle='#fff';ctx.fillRect(0,0,CW,CH);ctx.textBaseline='top';
   font(32,'bold');ctx.fillText(`词序 · ${model.test?'遮义自测':'今日词表'}`,M,55);font(19);ctx.fillText(`${model.date}  ·  共 ${model.ids.length} 词  ·  第 ${pageNo} 页`,M,104);y=150;
   ctx.fillStyle='#f1f1f1';ctx.fillRect(M,y,CW-2*M,48);font(20,'bold');ctx.fillText('序号',columns[0]+8,y+13);ctx.fillText('单词 / 音标',columns[1]+10,y+13);ctx.fillText(model.test?'回忆释义':'中文释义',columns[2]+10,y+13);ctx.fillText('掌握',columns[3]+10,y+13);
   for(const x of columns)line(x,y,x,y+48);line(M,y,CW-M,y);y+=48;line(M,y,CW-M,y);
  }
  async function finish(){
   const url=canvas.toDataURL('image/jpeg',.94);if(!url.startsWith('data:image/jpeg;base64,'))throw Error('当前浏览器无法编码PDF页面，请换浏览器重试');
   const binary=atob(url.slice(url.indexOf(',')+1)),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
   images.push({bytes,width:CW,height:CH});canvas.width=1;canvas.height=1;
  }
  function getImage(src,word){if(imageCache.has(src))return imageCache.get(src);const promise=new Promise((resolve,reject)=>{
   const im=new Image(),timer=setTimeout(()=>{im.onload=im.onerror=null;reject(Error(`“${word}”的原图加载超时，请检查网络后重试`))},15000);
   im.onload=()=>{clearTimeout(timer);resolve(im)};im.onerror=()=>{clearTimeout(timer);reject(Error(`“${word}”的原图未加载，请检查上线文件是否完整`))};im.src=src;
  });if(imageCache.size>=3)imageCache.delete(imageCache.keys().next().value);imageCache.set(src,promise);return promise}
  start();
  for(let i=0;i<model.ids.length;i++){
   const w=words[model.ids[i]],book=!!w.redbookImage&&(model.book||w.group===5);
   const a=wrap(w.word,columns[2]-columns[1]-24,22),phon=w.ipa?wrap('/'+w.ipa+'/',columns[2]-columns[1]-24,18):[];
   const text=model.test?'____________________________':w.meaning+(w.excerpt?'（原表截断）':'');
   const lines=wrap(text,columns[3]-columns[2]-24,20);let im=null,imHeight=0;
   if(!model.test&&book){im=await getImage(w.redbookImage,w.word);imHeight=(w.imageClip?w.imageClip.height/w.imageClip.width:im.naturalHeight/im.naturalWidth)*(columns[3]-columns[2]-24)}
   const height=Math.max(80,a.length*29+phon.length*26+24,im?imHeight+24:lines.length*29+24);
   if(y+height>BOTTOM){await finish();start()}
   font(19);ctx.fillText(String(i+1),columns[0]+10,y+14);font(22,'bold');a.forEach((t,j)=>ctx.fillText(t,columns[1]+10,y+13+j*29));font(18);phon.forEach((t,j)=>ctx.fillText(t,columns[1]+10,y+16+a.length*29+j*26));
   if(im){const c=w.imageClip;if(c)ctx.drawImage(im,c.x,c.y,c.width,c.height,columns[2]+12,y+12,columns[3]-columns[2]-24,imHeight);else ctx.drawImage(im,columns[2]+12,y+12,columns[3]-columns[2]-24,imHeight)}else{font(20);lines.forEach((t,j)=>ctx.fillText(t,columns[2]+12,y+13+j*29))}
   font(18);ctx.strokeStyle='#666';ctx.strokeRect(columns[3]+10,y+15,13,13);ctx.fillText('会',columns[3]+32,y+12);ctx.strokeRect(columns[3]+10,y+44,13,13);ctx.fillText('待背',columns[3]+32,y+41);
   for(const x of columns)line(x,y,x,y+height);y+=height;line(M,y,CW-M,y);
   onProgress?.(i+1,model.ids.length);if(i%12===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  await finish();return makePDF(images);
 };
})(window);
