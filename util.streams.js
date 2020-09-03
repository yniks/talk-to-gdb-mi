const {parseLine}=require('gdb-mi-output-parser')
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
        writableObjectMode: true
      })
      this.pattern=pattern
    }
  
    _transform(message, encoding, next) {
        
      if(this.pattern&&(matchPattern(this.pattern,message)))
        {
            return next(null,message)
        }
      else next()
    }
  }

/**
 *  Parse Function,Must be used to parse GDB MI output
 */
class Parser extends Transform {
    constructor() {
      super({
        readableObjectMode: true,
        writableObjectMode: true
      })
    }
  
    _transform(chunk, encoding, next) {
        return next(null,parseLine(chunk))        
    }
  }
  /**
   *  Parse Function,Must be used to parse GDB MI output
   */
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
    }
  
    _transform(message, encoding, next) {
      if(matchPattern(message,this.pattern))
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
  module.exports = {Matcher,Parser ,UTF8 ,Counter,SelfDestruct,Splitter}