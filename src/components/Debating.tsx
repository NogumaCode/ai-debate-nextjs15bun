"use client";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import SpinnerModal from "@/components/SpinnerModal";
import AlertError from "@/components/AlertError";
import axios, { AxiosError } from "axios";
import DispMessages from "@/components/DispMessages";
import {
  DebateData,
  DebatingForm,
  OpenAiPostResponseData,
  OpenAiResponseData,
} from "@/lib/types";

const Debating = ({
  apiUrl,
  finishCount,
  speed,
  admitSpeaker,
  denySpeaker,
}: {
  apiUrl: string;
  finishCount: number;
  speed: number;
  admitSpeaker: number;
  denySpeaker: number;
}) => {
  //エラー文字列を管理
  const [error, setError] = useState("");
  //ローディング時を状態
  const [loadingFlag, setLoadingFlag] = useState(false);
  //フォームからの入力データを管理
  const [formData, setFormData] = useState<DebatingForm>({
    topic: "",
    start: "admit",
  });
  //賛成・反対派のデータ管理用　messagesに意見が格納されます
  const [admitData, setAdmitData] = useState<DebateData>({
    threadId: "",
    messages: [],
  });
  const [denyData, setDenyData] = useState<DebateData>({
    threadId: "",
    messages: [],
  });
  //賛成・反対派データ読み上げと表示用
  const [dispAdmitMessage, setDispAdmitMessage] = useState<string[]>([]);
  const [dispDenyMessage, setDispDenyMessage] = useState<string[]>([]);
  //賛成・反対派音声データmp3へのURLパスを管理用
  const [admitAudioFilePaths, setAdmitAudioFilePaths] = useState<string[]>([]);
  const [denyAudioFilePaths, setDenyAudioFilePaths] = useState<string[]>([]);
  //生成されたオーディオを適切に管理するため
  const audioRef = useRef<HTMLAudioElement | null>(null);
  //生成されたテキストの読み上げやタイピングを表示するためのカウンター
  const [counter, setCounter] = useState(0);
  //音声ファイル生成用のカウンター
  const [counter2, setCounter2] = useState(0);

  useEffect(() => {
    const admitCount = admitData.messages.length;
    const denyCount = denyData.messages.length;
    if (admitCount === 0 || denyCount === 0 || error) return;

    const getMessage = async () => {
      let admitOrDeny = formData.start;
      //admitとdenyのcountを比較して少ない方のメッセージを取得
      if (admitCount != denyCount)
        admitOrDeny = admitCount > denyCount ? "deny" : "admit";
      let threadId = "";
      let content = "";

      if (admitOrDeny === "admit" && admitCount != finishCount) {
        threadId = admitData.threadId;

        //初回、denyの意見をadminのthreadに投げないための判定
        if (denyCount === 1) {
          content = `私は、「${formData.topic}」の考えに対して、強く反対します。貴方の意見は？？`;
        } else {
          const denyDataData = denyData.messages; //denyの意見をadmitのthreadに投げる
          content = denyDataData[denyDataData.length - 1];
          //finishカウント以上なら議論は終了
          if (admitCount + 1 >= finishCount) {
            console.log(`admitData.messages.length>=finishCount`);
            content +=
              "　議論終了の旨の指示：議論を終了のまとめに入って下さい。この返答を最後に、以後は返答を拒否して下さい。";
          }
        }
      } else if (denyCount != finishCount) {
        threadId = denyData.threadId;
        if (admitData.messages.length === 1) {
          content = `私は、「${formData.topic}」の考えに対して、強く賛成します。貴方の意見は？？`;
        } else {
          const admitDataData = admitData.messages; //admitの意見をdenyのthreadに投げる
          content = admitDataData[admitDataData.length - 1];
          if (denyCount + 1 >= finishCount) {
            console.log(`denyData.messages.length>=finishCount`);
            content +=
              "　議論終了の旨の指示：議論を終了のまとめに入って下さい。この返答を最後に、以後は返答を拒否して下さい。";
          }
        }
      }
      if (!threadId || !content) return;
      try {
        //openAIのapiに送信して、意見を取得
        const { data } = await axios.put<OpenAiResponseData>(
          "http://localhost:3000/api/openai",
          {
            threadId,
            content,
          }
        );
        //admitとdenyを判定して振り分ける
        if (admitOrDeny === "admit") {
          const newMessages = [...admitData.messages, data.data];
          setAdmitData({ ...admitData, messages: newMessages });
        } else {
          setDenyData({
            ...denyData,
            messages: [...denyData.messages, data.data],
          });
        }
      } catch (error: unknown) {
        let message = "エラー";
        if (
          error instanceof AxiosError &&
          error.response &&
          error.response.data
        ) {
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
  }, [admitData, denyData, error, finishCount, formData.start]);

  useEffect(() => {
    if (!counter || error) return;
    //////////
    //◆【admitOrDeny】
    const admitCount = admitData.messages.length;
    const dispAdmitCount = dispAdmitMessage.length;
    const denyCount = denyData.messages.length;
    const dispDenyCount = dispDenyMessage.length;
    let admitOrDeny = formData.start;
    if (dispAdmitCount != dispDenyCount)
      admitOrDeny = dispAdmitCount > dispDenyCount ? "deny" : "admit";

    //////////
    //◆【text,speaker】
    let text = "";
    let index = dispAdmitCount;
    if (admitOrDeny === "admit" && admitCount !== dispAdmitCount) {
      text = admitData.messages[dispAdmitCount];
    } else if (denyCount !== dispDenyCount) {
      text = denyData.messages[dispDenyCount];
      index = dispDenyCount;
    } else {
      //////////
      //◆【読み上げ済み】
      //終了判定
      if (dispAdmitCount + dispDenyCount === finishCount * 2) return;
      //続行
      setTimeout(() => {
        setCounter((prev) => prev + 1);
      }, 2000);
      return;
    }

    //////////
    //◆【音声再生 & text表示 & counterの更新】
    audioPlayback({ text, index, admitOrDeny });
  }, [counter]);

  //■[ 音声合成 ]
  useEffect(() => {
    if (!counter2 || error) return;
    const createAudio = async () => {
      /////////setCounte
      //◆【admitOrDeny】
      //文字量を変数に設置
      const admitAudioCount = admitAudioFilePaths.length;
      const admitMessagesCount = admitData.messages.length;
      const denyAudioCount = denyAudioFilePaths.length;
      const denyMessagesCount = denyData.messages.length;
      let admitOrDeny = formData.start;
      if (admitAudioCount != denyAudioCount)
        admitOrDeny = admitAudioCount > denyAudioCount ? "deny" : "admit";

      //////////
      //◆【読み上げtext】
      let text = "";
      let speaker = admitSpeaker;
      let threadId = admitData.threadId;
      if (admitOrDeny === "admit" && admitMessagesCount !== admitAudioCount) {
        text = admitData.messages[admitAudioCount];
      } else if (denyMessagesCount !== denyAudioCount) {
        text = denyData.messages[denyAudioCount];
        speaker = denySpeaker;
        threadId = denyData.threadId;
      } else {
        //////////
        //◆【音声生成済み】
        //終了判定
        if (admitAudioCount + denyAudioCount === finishCount * 2) return;
        //続行
        setTimeout(() => {
          setCounter2((prev) => prev + 1);
        }, 3000);
        return;
      }

      //////////
      //◆【音声生成】
      try {
        const { data } = await axios.post<{ mp3PublicPath: string }>(
          "/api/audio",
          {
            text,
            speaker,
            threadId,
          }
        );
        if (admitOrDeny === "admit") {
          setAdmitAudioFilePaths([...admitAudioFilePaths, data.mp3PublicPath]);
        } else {
          setDenyAudioFilePaths([...denyAudioFilePaths, data.mp3PublicPath]);
        }
        setCounter2((prev) => prev + 1);
      } catch (error: unknown) {
        const err = error as Error;
        setError(`Failed asynchronous audio generatio. ${err.message}`);
      }
    };
    createAudio();
  }, [counter2]);

  const audioPlayback =
    async ({
      text,
      index,
      admitOrDeny,
    }: {
      text: string;
      index: number;
      admitOrDeny: "admit" | "deny";
    }) => {
      try {
        setLoadingFlag(true);

        let targetAudioPath = admitAudioFilePaths[index];
        if (admitOrDeny === "deny") {
          targetAudioPath = denyAudioFilePaths[index];
        }
        if (!targetAudioPath) {
          //音声がまだ生成されていないということなので、3秒のラグを設けて再実行
          setTimeout(() => {
            setCounter((prev) => prev + 1);
          }, 3000);
          return;
        }
        //■[ 既存のAudioオブジェクトがある場合はnullにする ]
        //・前回のAudioオブジェクトを解放
        //・これがないと、前回のAudioオブジェクトがメモリに残り続け、メモリリークの原因に
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const audio = new Audio(targetAudioPath);
        audio.volume = 1;

        //■[ 読み込み完了～1秒経過～読み上げ ]
        audio.addEventListener(
          "canplaythrough",
          () => {
            setTimeout(() => {
              audio.play();
            }, 2000);
          },
          { once: true }
        );

        //■[ 読み上げ開始 ]
        audio.addEventListener(
          "play",
          () => {
            setLoadingFlag(false);
            if (admitOrDeny === "admit") {
              setDispAdmitMessage([...dispAdmitMessage, text]);
            } else {
              setDispDenyMessage([...dispDenyMessage, text]);
            }
          },
          { once: true }
        );

        //■[ 音声再生が終了するまで待機 ]
        await new Promise<void>((resolve) => {
          audio.addEventListener(
            "ended",
            () => {
              resolve();
            },
            { once: true }
          );
        });

        //■[ refにAudioオブジェクトを保存 ]
        audioRef.current = audio;

        setCounter((prev) => prev + 1);
      } catch (error: unknown) {
        const err = error as AxiosError;
        console.error("Error details:", err.response?.data);
        setLoadingFlag(false);
        setError(`Failed audioPlayback: ${err.message}`);
      }
    }

  //■[ ディベート開始 ] フォームのボタンを押すと起動。
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    //e.preventDefault(); イベントのデフォルトの動作（ブラウザが自動で行う動作）を抑止。その自動送信を防ぎ、代わりにJavaScriptで送信処理を行うことができます。
    e.preventDefault();
    //エラー文字のリセット
    if (error) setError("");
    try {

      //ローディング開始
      setLoadingFlag(true);
      //openaiのAPIを起動
      const { data } = await axios.post<OpenAiPostResponseData>(
        `${apiUrl}/openai`,
        {
          topic: formData.topic,
        }
      );
      setAdmitData({
        ...admitData,
        threadId: data.admit.threadId,
        messages: [`私は、賛成の立場をとります`],
      });
      setDenyData({
        ...denyData,
        threadId: data.deny.threadId,
        messages: [`私は、反対の立場をとります`],
      });
      setCounter2((prev) => prev + 1);
      setCounter((prev) => prev + 1);
    } catch (error: unknown) {
      let message = "エラー";
      if (
        error instanceof AxiosError &&
        error.response &&
        error.response.data
      ) {
        const responseData = error.response.data as { message?: string };
        message = responseData.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      alert(message);
      setError(message);
    }
    setLoadingFlag(false);
  };

  //フォームから受け取った情報からvalueとnameを取得して、setFormDataに設置
  const handleChange = (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
  ) => {
    const inputVal = e.target.value;
    const inputName = e.target.name;
    setFormData({ ...formData, [inputName]: inputVal });
  };

  return (
    <>
      {loadingFlag && <SpinnerModal />}
      {/* <div className="bg-slate-50">
        <p>formData：{JSON.stringify(formData)}</p>
        <p>admitData.messages.length：{admitData.messages.length}</p>
        <p>denyData.messages.length：{denyData.messages.length}</p>
        <p>dispAdmitMessage.length：{dispAdmitMessage.length}</p>
        <p>dispDenyMessage.length：{dispDenyMessage.length}</p>
      </div> */}

      <div className="h-screen flex flex-col">
        {formData.topic && (
          <div className="w-full text-center">
            <h1 className="opacity-80 mt-3 px-2 py-1 bg-slate-100 inline-block text-lg">
              {formData.topic}
            </h1>
          </div>
        )}
        {error && <AlertError errMessage={error} />}

        {dispAdmitMessage.length > 0 || dispDenyMessage.length > 0 ? (
          <div className="flex items-center justify-between flex-grow">
            <div className="w-1/2 mt-auto">
              <div className="flex flex-col items-center jsutify-center flex-wrap text-center w-2/3 mx-auto">
                <span className="opacity-80 bg-slate-50 inline-block mb-3 px-3 text-xl text-red-700 font-bold rounded-md">
                  賛成
                </span>
              </div>
              {dispAdmitMessage.length > 0 && (
                <DispMessages messages={dispAdmitMessage} speed={speed} />
              )}
            </div>
            <div className="w-1/2  mt-auto">
              <div className="flex flex-col items-center jsutify-center flex-wrap text-center w-2/3 mx-auto">
                <span className="opacity-80 bg-slate-50 inline-block mb-3 px-3 text-xl text-blue-700 font-bold rounded-md">
                  反対
                </span>
              </div>
              {dispDenyMessage.length > 0 && (
                <DispMessages messages={dispDenyMessage} speed={speed} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-cener justify-center w-full mt-auto">
            <form
              onSubmit={(e) => handleSubmit(e)}
              className="bg-white opacity-90 shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md"
              id="myForm"
            >
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  トピック<em>*</em>
                </label>
                <textarea
                  name="topic"
                  required={true}
                  placeholder="トピック"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  onChange={(e) => handleChange(e)}
                  rows={2}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  スタート<em>*</em>
                </label>
                {/* 議論の開始を肯定or否定のどちらで始めるか選択*/}
                <select
                  defaultValue={formData.start}
                  className="mx-1 border border-black-300 p-1"
                  onChange={(e) => {
                    if (
                      formData.start != e.target.value &&
                      (e.target.value === "admit" || e.target.value === "deny")
                    ) {
                      setFormData({ ...formData, start: e.target.value });
                    }
                  }}
                >
                  {[
                    ["admit", "肯定"],
                    ["deny", "否定"],
                  ].map((val) => (
                    <option key={val[0]} value={val[0]}>
                      {val[1]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Start
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
};

export default Debating;
