import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import EmployeeManagement from "@/pages/employee-management";
import NotFound from "@/pages/not-found";

function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed top-16 left-4 z-50">
      <div className="flex flex-col space-y-2">
        <Link href="/">
          <Button
            variant={location === "/" ? "default" : "outline"}
            size="sm"
            className="w-full justify-start"
          >
            <Clock className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/employees">
          <Button
            variant={location === "/employees" ? "default" : "outline"}
            size="sm"
            className="w-full justify-start"
          >
            <Users className="mr-2 h-4 w-4" />
            Employees
          </Button>
        </Link>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="relative">
      <Navigation />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/employees" component={EmployeeManagement} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
