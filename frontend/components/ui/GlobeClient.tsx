"use client";

import dynamic from "next/dynamic";

const World = dynamic(() => import("./globe").then(m => m.World), {
  ssr: false,
});

export default World;
