var store=new WeakMap();
var e=require('execa');
var Path=require('path')
function getInstance(path){
    if (store.has(path))
        return store.get(path);
    var gdb=e('gdb',['-q','-i=mi2',Path.basename(path)],{cwd:Path.dirname(path)})
    var id=Date.now()+Math.random()
    
  return {
    id:path,
    gdb,
    close:function(){
      delete store[id]
      e.kill()
    }
  };
}
module.exports = getInstance;