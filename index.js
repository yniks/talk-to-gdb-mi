const getGdb=require('./gdbintstance')
const matchPattern = require('lodash-match-pattern');
var _ = matchPattern.getLodashModule();
const {pipeline}=require('stream')
const {Matcher, Parser, UTF8 ,Counter,SelfDestruct,Splitter}=require('./util.streams');
module.exports=async function getgdb(path)
{
    var counter=0
    var {gdb}=await getGdb(path)
    var messages=pipeline(gdb.stdout,new UTF8(),new Splitter(),new Parser(),new Counter(),function(err){console.error('>>>')})
     messages.on('data',(data)=>{console.log(">>>>>>>DATA: received @ Couter",)})
     return {
        onmessage(pattern={},untill=null)
        {
           
            var output= pipeline(messages,new Matcher(pattern),()=>{console.log(pattern,"is not being listened!")})
            output.on('data',(data)=>{console.log(">>>>>>>DATA: received @ matcher",)})
            if (untill){
                output=pipeline(output,new SelfDestruct(untill),()=>{})
                output.on('data',(data)=>{console.log(">>>>>>>DATA: received @ SelfDestruct",)})
            }
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
        gdb
    }
}