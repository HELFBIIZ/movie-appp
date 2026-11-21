import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"SceneChain Learning | Demo",description:"English learning from bilingual video scenes"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="mn"><body>{children}</body></html>;}
