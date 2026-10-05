import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Saathi — everyday rides, together',description:'Book affordable scheduled e-rickshaw rides from your local pickup point.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
