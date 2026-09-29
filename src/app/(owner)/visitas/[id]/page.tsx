import { VisitDetail } from '@/features/visits/detail';
export default async function Page({params}:{params:Promise<{id:string}>}) { const {id}=await params; return <VisitDetail id={id}/>; }
