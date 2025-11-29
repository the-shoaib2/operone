
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function TaskPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-background">
            <header className="flex items-center gap-4 p-4 border-b">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-lg font-semibold">Task Details</h1>
            </header>
            <main className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-card rounded-lg border p-6 shadow-sm">
                        <h2 className="text-xl font-semibold mb-4">Current Task</h2>
                        <p className="text-muted-foreground mb-6">
                            Detailed view of the current agent task and execution logs will appear here.
                        </p>
                        {/* Placeholder for detailed task view */}
                        <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center border border-dashed">
                            <span className="text-muted-foreground">Task Execution Logs</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
