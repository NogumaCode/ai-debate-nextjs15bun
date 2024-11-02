"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({ error }: { error: Error }) {
  const router = useRouter();
  
  useEffect(() => {
    // エラー内容をコンソールに出力
    console.error("An error occurred:", error);
  }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-4 space-y-4 bg-white rounded shadow-md">
        <p className="text-lg font-semibold text-red-600">
          Data fetching in server failed
        </p>
        <p className="text-gray-500">
          データの取得に失敗しました。リロードでもう一度お試しください。
        </p>
        <p className="text-sm text-gray-400">なにか問題があります。</p>
        <Button
          onClick={() => {
            router.push("/");
          }}
          variant="primary"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
