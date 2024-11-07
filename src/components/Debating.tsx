'use client'
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import SpinnerModal from "@/components/SpinnerModal";
import AlertError from "@/components/AlertError";
import axios, { AxiosError } from "axios";
import DispMessages from "@/components/DispMessages";
import { DebateData, DebatingForm, OpenAiPostResponseData, OpenAiResponseData } from "@/lib/types";

const Debating = ({
    apiUrl,
    finishCount,
    speed,
}:{
    apiUrl:string //APIのURL
    finishCount:number //Assistantが何回か返答したら、ディベートを終了するか
    speed:number //メッセージの表示を速度をミリ秒で
}) => {
    const [error, setError] = useState('');
    const [loadingFlag,setLoadingFlag] = useState(false);
    const [formData,setFormData] = useState<DebatingForm>({
      topic:'',
      start:'admit',
    });
    const [admitData,setAdmitData] = useState<DebateData>({
      threadId:'',
      messages:[],
    });
    const [denyData,setDenyData] = useState<DebateData>({
      threadId:'',
      messages:[],
    });
    const [dispAdmitMessage,setDispAdmitMessage] = useState<string[]>([]);
    const [dispDenyMessage,setDispDenyMessage] = useState<string[]>([]);
    const [counter,setCounter] = useState(0);

    useEffect(()=>{
      const admitCount = admitData.messages.length;
      const denyCount = denyData.messages.length;
      if(admitCount===0 || denyCount===0 || error)return;

      const getMessage = async() => {
        let admitOrDeny = formData.start;
        if(admitCount!=denyCount)admitOrDeny = admitCount>denyCount ? 'deny' :'admit';
        let threadId = '';
        let content = '';
        if(admitOrDeny==='admit' && admitCount!=finishCount){
          threadId = admitData.threadId;
          if(denyCount===1){
            content = `私は、「${formData.topic}」の考えに対して、強く反対します。貴方の意見は？？`;
          }else{
            const denyDataData = denyData.messages;//denyの意見をadmitのthreadに投げる
            content = denyDataData[denyDataData.length-1];
            if(admitCount+1 >=finishCount){
              console.log(`admitData.messages.length>=finishCount`)
              content += '　議論終了の旨の指示：議論を終了のまとめに入って下さい。この返答を最後に、以後は返答を拒否して下さい。';
            }
          }
        }else if(denyCount!=finishCount){
          threadId = denyData.threadId;
          if(admitData.messages.length===1){
            content = `私は、「${formData.topic}」の考えに対して、強く賛成します。貴方の意見は？？`;
          }else{
            const admitDataData = admitData.messages;//admitの意見をdenyのthreadに投げる
            content = admitDataData[admitDataData.length-1];
            if(denyCount+1 >=finishCount){
              console.log(`denyData.messages.length>=finishCount`)
              content += '　議論終了の旨の指示：議論を終了のまとめに入って下さい。この返答を最後に、以後は返答を拒否して下さい。';
            }
          }
        }
        if(!threadId || !content)return;
        try{
          const {data} = await axios.put<OpenAiResponseData>(
            'http://localhost:3000/api/openai',
            {
              threadId,
              content,
            }
          );
          if(admitOrDeny==='admit'){
            const newMessages = [...admitData.messages, data.data];
            setAdmitData({...admitData, messages:newMessages});
          }else{
            // const newMessages = [...denyData.messages, data.data];
            setDenyData({...denyData, messages:[...denyData.messages, data.data]});
          }
        }catch (error: unknown) {
          let message = 'エラー';
          if (error instanceof AxiosError && error.response && error.response.data) {
              const responseData = error.response.data as { message?: string };
              message = responseData.message || error.message;
          } else if (error instanceof Error) {
              message = error.message;
          }
          alert(message);
          setError(message);
      }
    };
      getMessage();
    }, [admitData, denyData, error, finishCount, formData.start, formData.topic]);

    useEffect(()=>{
      if(!counter)return;

      //////////
      //◆【admitOrDeny】
      const admitCount = admitData.messages.length;
      const dispAdmitCount = dispAdmitMessage.length;


      const denyCount = denyData.messages.length;
      const dispDenyCount = dispDenyMessage.length;
      let admitOrDeny = formData.start;
      if(dispAdmitCount!=dispDenyCount)admitOrDeny = dispAdmitCount>dispDenyCount ? 'deny' :'admit';

      //////////
      //◆【表示するtext】
      let text = '';
      if(admitOrDeny==='admit' && admitCount!==dispAdmitCount){
        text = admitData.messages[dispAdmitCount];
        setDispAdmitMessage([...dispAdmitMessage,text]);
      }else if(denyCount!==dispDenyCount){
        text = denyData.messages[dispDenyCount];
        setDispDenyMessage([...dispDenyMessage,text]);
      }else{
        //タイピング済み
        console.log('タイピング済み');
        //終了判定
        if( dispAdmitCount+dispDenyCount === finishCount*2)return
        //続行
        setTimeout( () => { setCounter((prev)=>prev+1) },2000);
        return;
      }

      //////////
      //◆【標示が完了したら、再度実行】
      setTimeout( () => { setCounter((prev)=>prev+1) }, speed*(text.length+30));

    },[ counter,
      admitData.messages,
      denyData.messages,
      dispAdmitMessage,
      dispDenyMessage,
      finishCount,
      formData.start,
      speed])

    const handleSubmit = async (e:FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if(error)setError('');
      //////////
      //□バリデーション
      if(!formData.topic){
        alert('トピックを入力して下さい');
        return;
      }
      try {

          //////////
          //□通信
          setLoadingFlag(true);
          const {data} = await axios.post<OpenAiPostResponseData>(`${apiUrl}/openai`, {
              topic: formData.topic,
          });
          setAdmitData({...admitData, threadId:data.admit.threadId ,messages:[`私は、${formData.topic}に対して賛成です`] });
          setDenyData({...denyData, threadId:data.deny.threadId, messages:[`私は、${formData.topic}に対して反対です`]});
          setCounter((prev) => prev+1);
      } catch(error:unknown){
        let message = 'エラー';
        if (error instanceof AxiosError && error.response && error.response.data) {
          // `data`を型アサーションして、期待される型のプロパティにアクセスする
          const responseData = error.response.data as { message?: string };
          message = responseData.message || error.message;
      } else if (error instanceof Error) {
          message = error.message;
      }
        alert(message);
        setError(message);

    }
      setLoadingFlag(false);
    }

    const handleChange = (e:ChangeEvent<HTMLInputElement>|ChangeEvent<HTMLTextAreaElement>) => {
      const inputVal = e.target.value;
      const inputName = e.target.name;
      setFormData({...formData,[inputName]:inputVal})
    }

    return (<>
      {loadingFlag&&<SpinnerModal/>}
      {/* <div className="bg-slate-50">
        <p>formData：{JSON.stringify(formData)}</p>
        <p>admitData.messages.length：{admitData.messages.length}</p>
        <p>denyData.messages.length：{denyData.messages.length}</p>
        <p>dispAdmitMessage.length：{dispAdmitMessage.length}</p>
        <p>dispDenyMessage.length：{dispDenyMessage.length}</p>
      </div> */}

      <div className="h-screen flex flex-col">
        {formData.topic&&(
          <div className="w-full text-center">
            <h1 className="opacity-80 mt-3 px-2 py-1 bg-slate-100 inline-block text-lg">{formData.topic}</h1>
          </div>
        )}
        {error && <AlertError errMessage={error}/>}

        {dispAdmitMessage.length>0 || dispDenyMessage.length>0
          ?(
            <div className="flex items-center justify-between flex-grow">
              <div className="w-1/2 mt-auto">
                  <div className="flex flex-col items-center jsutify-center flex-wrap text-center w-2/3 mx-auto">
                      <span className="opacity-80 bg-slate-50 inline-block mb-3 px-3 text-xl text-red-700 font-bold rounded-md">賛成</span>
                  </div>
                  {dispAdmitMessage.length>0 && (
                      <DispMessages messages={dispAdmitMessage} speed={speed}/>
                  )}
              </div>
              <div className="w-1/2  mt-auto">
                  <div className="flex flex-col items-center jsutify-center flex-wrap text-center w-2/3 mx-auto">
                      <span className="opacity-80 bg-slate-50 inline-block mb-3 px-3 text-xl text-blue-700 font-bold rounded-md">反対</span>
                  </div>
                  {dispDenyMessage.length>0 && (
                      <DispMessages messages={dispDenyMessage} speed={speed} />
                  )}
              </div>
            </div>
          ):(
            <div className="flex items-cener justify-center w-full mt-auto">
              <form onSubmit={(e) => handleSubmit(e)} className="bg-white opacity-90 shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md" id='myForm'>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">トピック<em>*</em></label>
                    <textarea
                        name='topic'
                        required={true}
                        placeholder="トピック"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        onChange={(e)=>handleChange(e)}
                        rows={2}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">スタート<em>*</em></label>
                    {/* 議論の開始を肯定or否定のどちらで始めるか選択*/}
                    <select
                        defaultValue={formData.start}
                        className="mx-1 border border-black-300 p-1"
                        onChange={(e)=>{
                            if(formData.start!=e.target.value && (e.target.value==='admit' || e.target.value==='deny')){
                              setFormData({...formData, start:e.target.value});
                            }
                        }}
                    >
                      {[['admit','肯定'],['deny','否定']].map((val)=>(
                          <option key={val[0]} value={val[0]}>{val[1]}</option>
                      ))}
                    </select>
                </div>
                <div className='flex items-center justify-between'>
                    <button
                        className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                        type="submit"
                    >
                        Start
                    </button>
                </div>
              </form>
            </div>
          )
        }
      </div>
    </>)
}

export default Debating
