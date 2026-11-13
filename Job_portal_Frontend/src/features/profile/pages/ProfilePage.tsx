import ProfileWorkspace from "../components/ProfileWorkspace";
import { Card } from "../../../components/common/Card";
import { ResumeUpload } from "../../../components/resume/ResumeUpload";
export default function ProfilePage() { return <div className="content-stack"><ProfileWorkspace /><Card className="resume-card"><ResumeUpload /></Card></div>; }
