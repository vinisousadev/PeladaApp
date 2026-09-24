import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Pelada Club',description:'Sua pelada, sua cartinha e o ranking do mês.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Pelada Club'}};
export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:'#11150f'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>;}
