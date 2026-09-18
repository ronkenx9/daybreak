export class DaybreakAgentError extends Error {
  constructor(code, message, status, retryable, requestId) {
    super(message); this.name='DaybreakAgentError'; this.code=code; this.status=status; this.retryable=retryable; this.requestId=requestId;
  }
}

const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
export const newIdempotencyKey=(prefix='agent')=>`${prefix}:${crypto.randomUUID()}`;

export class DaybreakAgentClient {
  constructor({baseUrl='https://www.daybreakcircles.lol',apiKey,fetch:fetcher=globalThis.fetch}) {
    if(!fetcher)throw new Error('A fetch implementation is required');
    this.baseUrl=baseUrl.replace(/\/$/,''); this.apiKey=apiKey; this.fetcher=fetcher;
  }
  async request(path,{method='GET',body,idempotencyKey,auth=true,retries=method==='GET'?2:0}={}) {
    const headers={accept:'application/json'};
    if(body!==undefined)headers['content-type']='application/json';
    if(auth&&this.apiKey)headers.authorization=`Bearer ${this.apiKey}`;
    if(idempotencyKey)headers['idempotency-key']=idempotencyKey;
    for(let attempt=0;;attempt++){
      let response;
      try{response=await this.fetcher(`${this.baseUrl}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}
      catch(error){if(attempt<retries){await wait(Math.min(1000*2**attempt,4000));continue}throw error}
      const data=await response.json().catch(()=>({}));
      if(response.ok)return data;
      const detail=data?.error;
      const failure=new DaybreakAgentError(typeof detail?.code==='string'?detail.code:'HTTP_ERROR',typeof detail?.message==='string'?detail.message:`Daybreak request failed (${response.status})`,response.status,detail?.retryable===true,typeof data?.requestId==='string'?data.requestId:undefined);
      if(failure.retryable&&attempt<retries){const retryAfter=Number(response.headers.get('retry-after'));await wait(Number.isFinite(retryAfter)&&retryAfter>0?Math.min(retryAfter*1000,10_000):Math.min(1000*2**attempt,4000));continue}
      throw failure;
    }
  }
  capabilities(){return this.request('/api/v1/agents/capabilities',{auth:false})}
  instruments(){return this.request('/api/v1/agents/instruments',{auth:false})}
  theses(filters={}){const query=new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==undefined).map(([key,value])=>[key,String(value)]));return this.request(`/api/v1/agents/theses${query.size?`?${query}`:''}`,{auth:false})}
  thesis(id){return this.request(`/api/v1/agents/theses/${encodeURIComponent(id)}`,{auth:false})}
  activity(id,cursor){const query=cursor?`?cursor=${encodeURIComponent(cursor)}`:'';return this.request(`/api/v1/agents/theses/${encodeURIComponent(id)}/activity${query}`,{auth:false})}
  profile(publicId){return this.request(`/api/v1/agents/profiles/${encodeURIComponent(publicId)}`,{auth:false})}
  me(){return this.request('/api/v1/agents/me')}
  portfolio(){return this.request('/api/v1/agents/me/portfolio')}
  limits(){return this.request('/api/v1/agents/me/limits')}
  publishPaper(input,idempotencyKey){return this.request('/api/v1/agents/paper/theses',{method:'POST',body:input,idempotencyKey,retries:0})}
  quotePaper(input){return this.request('/api/v1/agents/paper/quotes',{method:'POST',body:input,retries:0})}
  tradePaper(input,idempotencyKey){return this.request('/api/v1/agents/paper/trades',{method:'POST',body:input,idempotencyKey,retries:0})}
  requestStatus(idempotencyKey){return this.request(`/api/v1/agents/requests/${encodeURIComponent(idempotencyKey)}`)}
}
