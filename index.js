const execa=require('execa')

const debug=require('debug')
const dmsgstream=debug('msgstream')
const derror=debug('msgstream:error')
const dmatcher=debug('msgstream:matcher')
const dcounter=debug('msgstream:counter')
const dselfdestruct=debug('msgstream:selfdestruct')

const {pipeline, PassThrough}=require('stream')
const path=require('path')
const {Matcher, Parser, UTF8 ,Counter,SelfDestruct,Splitter}=require('./util.streams');
async function getgdb(targetpath='',gdgcwd=null)
{
    var counter=0
    var gdb=execa('gdb',['-q','-i=mi2',path.basename(targetpath)],{cwd:gdgcwd||path.dirname(targetpath)})
    var messages=pipeline(gdb.stdout,new UTF8(),new Splitter(),new Parser(),new Counter(),function(err){(err) => {
        if (err) {
         derror(err);
        } else {
            dmsgstream('Pipeline Finished.');
        }
      }})
     messages.on('data',(data)=>{dcounter(data)})
     return {
        _instance:gdb,
        onmessage(pattern={},untill=null)
        {       
                var passthru=messages.pipe(new PassThrough({writableObjectMode:true,readableObjectMode:true}))
                if (untill){
                    var output=pipeline(passthru,new SelfDestruct(untill),()=>{console.log(pattern,"is destroyed!");output.destroy()})
                    output.on('end',(data)=>{dselfdestruct('pattern',pattern,'is self destroyed')})
                }else var output=passthru
                var resultpipe= pipeline(output,new Matcher(pattern),()=>{console.log(pattern,"is not being listened!");passthru.destroy()})
                resultpipe.on('data',(data)=>{dmatcher('pattern',pattern,'matched with',data)})
                resultpipe.on('end',()=>{dmatcher(pattern ,'stream ended.');messages.unpipe(passthru)})
                return resultpipe
        },
        send(string)
        {
            var id=counter++;
            var token=/^(\d*?)-/.exec(string)?.map(_=>_)[1]
            if (!token){
                string=id+string
                token=id+'';
                }
            gdb.stdin.write(string)
            return token
        },
        request(string)
        {
            var token=this.send(string)
            return this.onmessage({token,'async-type':'result-record'},{sequenceEnded:true})
        },
        stop()
        {
            return gdb.kill()
        }
    }
}
module.exports={init:getgdb}