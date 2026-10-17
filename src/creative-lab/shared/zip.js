// Dependency-free ZIP writer (stored entries). Shared by the CLI and browser.
const encoder = new TextEncoder();
const table = Uint32Array.from({length:256}, (_, n) => {
  let value=n;for(let i=0;i<8;i++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;
});
function crc32(bytes) {let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function join(chunks) {const result=new Uint8Array(chunks.reduce((size,chunk)=>size+chunk.length,0));let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;}
export function zip(files) {
  const local=[],central=[];let offset=0;
  for(const [path,value] of Object.entries(files).sort(([a],[b])=>a.localeCompare(b))){
    if(path.startsWith('/')||path.split('/').includes('..')||path.includes('\\'))throw new Error('Unsafe archive path');
    const name=encoder.encode(path),data=typeof value==='string'?encoder.encode(value):value,crc=crc32(data);
    const header=new Uint8Array(30),view=new DataView(header.buffer);
    view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(12,33,true);
    view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);
    local.push(header,name,data);
    const record=new Uint8Array(46),recordView=new DataView(record.buffer);
    recordView.setUint32(0,0x02014b50,true);recordView.setUint16(4,20,true);recordView.setUint16(6,20,true);recordView.setUint16(8,0x800,true);recordView.setUint16(14,33,true);
    recordView.setUint32(16,crc,true);recordView.setUint32(20,data.length,true);recordView.setUint32(24,data.length,true);recordView.setUint16(28,name.length,true);recordView.setUint32(42,offset,true);
    central.push(record,name);offset+=header.length+name.length+data.length;
  }
  const directory=join(central),end=new Uint8Array(22),endView=new DataView(end.buffer);
  endView.setUint32(0,0x06054b50,true);endView.setUint16(8,Object.keys(files).length,true);endView.setUint16(10,Object.keys(files).length,true);endView.setUint32(12,directory.length,true);endView.setUint32(16,offset,true);
  return join([...local,directory,end]);
}
