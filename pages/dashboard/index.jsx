import { useEffect } from "react";
import { useRouter } from "next/router";

const DashboardIndexPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect /dashboard to the dedicated home route to ensure
    // a single, consistent layout and data-loading path
    router.replace("/dashboard/home");
  }, [router]);

  return null;
};

export default DashboardIndexPage;