import { useState, useEffect } from 'react'
import { Card } from '@/components'
import { Input } from '@/components'
import { Search } from 'lucide-react'

export function MemorySettings() {
    const [stats, setStats] = useState({ vectorDocuments: 0, shortTermMemory: 0 })
    const [query, setQuery] = useState('')

    useEffect(() => {
        // Load stats
        // window.electron?.getStats().then(setStats)
        setStats({ vectorDocuments: 12, shortTermMemory: 5 })
    }, [])

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Vector Documents</h3>
                    <p className="text-3xl font-bold mt-2">{stats.vectorDocuments}</p>
                </Card>
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Short-term Items</h3>
                    <p className="text-3xl font-bold mt-2">{stats.shortTermMemory}</p>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search memory..."
                        className="pl-9"
                    />
                </div>

                <div className="text-center py-12 text-muted-foreground">
                    No memory items found matching your query.
                </div>
            </div>
        </div>
    )
}
