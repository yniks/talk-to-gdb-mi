const {ParserTransformer}=require('gdb-mi-output-parser')
const matchPattern = require('object-pattern-match');
const {Transform}=require('stream')
/**
 *  Matcher Class, can be used to filter a stream or an Iterable based on a pattern
 */
class Matcher extends Transform {
    pattern;
    constructor(pattern={}) {
      super({
        readableObjectMode: true,
        writableObjectMode: true,
        readableHighWaterMark:100000,
      })
      this.pattern=pattern
    }
  
    _transform(message, encoding, next) {
        //patch undefined token number
      if(this.pattern&&(matchPattern(this.pattern,message)))
        {
            return next(null,message)
        }
      else next()
    }
  }
  class UTF8 extends Transform {
    constructor() {
      super({
        readableObjectMode: true,
        writableObjectMode: true
      })
    }
  
    _transform(chunk, encoding, next) {
        this.push(chunk.toString('utf-8'))        
        return next()
    }
  }
  /**
   *  Self Destruct the Stream when a Certain condition matches
   */
  class SelfDestruct extends Transform {
    constructor(pattern) {
      super({
        readableObjectMode: true,
        writableObjectMode: true
      })
      this.pattern=pattern
      this._transform=(message, encoding, next)=>{
        pattern[Symbol.for("firstMessage")]=message.msg_num
        pattern[Symbol.for("firstSequence")]=message.seq_num
        this._transform=this._transform_
        return this._transform(message, encoding, next)
      }
    }
    _transform_(message, encoding, next) {
      if(matchPattern(this.pattern,message))
        return this.push(null);
      else return next(null,message)        
    }
  }
  /**
   * Tags the messages by message count and sequence count
   */
  class Counter extends Transform {
      constructor() {
        super({
          readableObjectMode: true,
          writableObjectMode: true
        })
        this.messageCount=0;
        this.sequenceCount=0;
      }
    
      _transform(message, encoding, next) {
          return next(null,Object.assign(message,{msg_num:this.messageCount++,seq_num:message.sequenceEnded?this.sequenceCount++:this.sequenceCount}))        
      }
    }
    /**
     * Splits the message when two mesages happen to arrive in as one chunk
     */
    class Splitter extends Transform {
        constructor() {
          super({
            readableObjectMode: true,
            writableObjectMode: true
          })
        }
      
        _transform(chunck, encoding, next) {
            var lines=chunck.trim().split('\n')
            lines.forEach(element => this.push(element));
            return next()
        }
      }
  module.exports = {Matcher,UTF8 ,Counter,SelfDestruct,Splitter,Parser:ParserTransformer}