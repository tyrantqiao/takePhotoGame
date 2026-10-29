export async function downloadContactSheet(entry,count,name,roundId) {
  const columns=count===1?1:count===4?2:3, rows=Math.ceil(count/columns);
  const cell=400,pad=20,header=90;
  const canvas=document.createElement('canvas');canvas.width=columns*cell+pad*2;canvas.height=rows*310+header+pad;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f0e4';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#2d4937';ctx.font='bold 22px sans-serif';ctx.fillText('WILDFRAME / '+name, pad,36,canvas.width-pad*2);
  ctx.font='14px sans-serif';ctx.fillText(`${count} 镜头组照 · ${entry.completed}/${count} 已交片 · 总分 ${entry.score} / 100`,pad,65);
  await Promise.all(Array.from({length:count},async(_,index)=>{
    const photo=entry.photos[index],x=pad+(index%columns)*cell,y=header+Math.floor(index/columns)*310;
    ctx.fillStyle='#e0e3d5';ctx.fillRect(x,y,cell-10,260);
    if(photo?.image){const image=new Image();image.src=photo.image;await image.decode();ctx.drawImage(image,x,y,cell-10,260);}
    ctx.fillStyle='#526449';ctx.font='13px sans-serif';ctx.fillText(`镜头 ${index+1} · ${photo?photo.score+' 分':'未完成（0 分）'}`,x,y+283);
  }));
  const url=canvas.toDataURL('image/jpeg',.9);
  let dialog=document.getElementById('sheetDialog');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='sheetDialog';dialog.className='sheet-dialog';
    const close=document.createElement('button');close.className='close';close.textContent='×';close.setAttribute('aria-label','关闭组照预览');close.onclick=()=>dialog.close();
    const title=document.createElement('h2');title.textContent='你的整套组照';
    const image=document.createElement('img');image.id='sheetPreview';image.alt='已生成的完整摄影组照';
    const link=document.createElement('a');link.id='sheetDownload';link.className='primary';link.textContent='↓ 下载 JPEG 组照';
    dialog.append(close,title,image,link);document.body.append(dialog);
  }
  document.getElementById('sheetPreview').src=url;
  const link=document.getElementById('sheetDownload');link.download=`wildframe-round-${roundId}-${count}frames.jpg`;link.href=url;
  if(!dialog.open)dialog.showModal();
  return {url,width:canvas.width,height:canvas.height};
}
