const execa=require('execa')

const debug=require('debug')
const dmsgstream=debug('msgstream')
const derror=debug('msgstream:error')
const dmatcher=debug('msgstream:matcher')
const dcounter=debug('msgstream:counter')
const dselfdestruct=debug('msgstream:selfdestruct')

const {pipeline}=require('stream')
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
        {   var output;
            if (untill){
                output=pipeline(messages,new SelfDestruct(untill),()=>{})
                output.on('end',(data)=>{dselfdestruct('pattern',pattern,'is self destroyed')})
            }
            else output=messages
            output= pipeline(output,new Matcher(pattern),()=>{console.log(pattern,"is not being listened!")})
            output.on('data',(data)=>{dmatcher('pattern',pattern,'matched with',data)})
            
            return output
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