import { permanentRedirect } from "next/navigation";

export default function LoginInstructorRedirectPage() {
  permanentRedirect("/instructor");
}
