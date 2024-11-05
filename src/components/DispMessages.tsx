'use client'
import { useEffect, useRef, useState } from 'react';

const DispMessages = ({
    messages,
    speed,  //文字の表示速度をミリ秒で
    addClassName, //左右で表示位置が違うので、tailwindcssのクラス名を受け取る
}: {
    messages: string[],
    speed: number
    addClassName: string
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);
    const lastMessage = messages[messages.length - 1];
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setDisplayedText('');
        setIndex(0);
    }, [messages]);

    useEffect(() => {
        if (index < lastMessage.length) {
            const currentScroll = scrollRef.current;
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + lastMessage.charAt(index));
                if(currentScroll)currentScroll.scrollTop = currentScroll.scrollHeight;
                setIndex(index + 1);
            }, speed);
            return () => clearTimeout(timeout);
        }
    }, [index, lastMessage, speed]);

    return (
        <div
            ref={scrollRef}
            className={`bg-slate-100 opacity-85 w-2/3 ml-5 mb-2 rounded-md max-h-[350px] overflow-y-auto ${addClassName}`}
        >
            {/*■[ messagesの最後の要素以外は、普通にレンダリング ]*/}
            {messages.slice(0, -1).map((message) => (
                <p key={message.substring(0, 5)} className="p-5">{message}</p>
            ))}

            {/*■[ messagesの最後の要素のみ、タイピング風に1字ずつレンダリング ]*/}
            <p className="p-5">{displayedText}</p>
        </div>
    );
};
export default DispMessages;
