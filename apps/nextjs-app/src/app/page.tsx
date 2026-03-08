import { getServerGunsole } from "@/lib/gunsole-server";
import GunsoleTest from "./components/GunsoleTest";

export default async function Home() {
  const gunsole = await getServerGunsole();
  gunsole.info({
    message: "Home page rendered",
    bucket: "ssr",
  });
  await gunsole.flush();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full">
        <GunsoleTest />
      </main>
    </div>
  );
}
