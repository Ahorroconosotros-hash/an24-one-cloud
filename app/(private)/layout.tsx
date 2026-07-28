import AppShell from "@/components/AppShell";

type PrivateLayoutProps = {
  children: React.ReactNode;
};

export default function PrivateLayout({ children }: PrivateLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
