import Debating from "@/components/Debating";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:3000/api/';
const finishCount = 3;
const speed = 100;
const admitSpeaker =2;
const denySpeaker = 12;

export default async function Home() {
  // エラーページ検証
  // throw new Error("This is a server-side error for testing the error page.");
  //ローディング画面検証
  // await new Promise((resolve)=>setTimeout(resolve,6000))
  return (
    <Debating apiUrl={apiUrl} finishCount={finishCount} speed={speed} admitSpeaker={admitSpeaker} denySpeaker={denySpeaker}/>
  );
}
