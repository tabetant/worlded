import { requireAdmin, getUserRole } from '@/lib/auth/roles'
import Link from 'next/link'

// =============================================================================
// Admin Dashboard — Server Component
// Protected: redirects non-admin users to home page
// =============================================================================

export default async function AdminPage() {
    // Guard: only admins can access this page
    await requireAdmin('/')

    const role = await getUserRole()

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                            <span className="text-white text-lg">⚙️</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Admin Dashboard
                            </h1>
                            <p className="text-sm text-gray-500">
                                Platform administration &amp; management
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Logged in as: <span className="font-medium text-gray-600">{role}</span>
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <p className="text-sm text-gray-500 mb-1">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900">—</p>
                        <p className="text-xs text-gray-400 mt-1">TODO: Wire to database</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <p className="text-sm text-gray-500 mb-1">Total Courses</p>
                        <p className="text-3xl font-bold text-gray-900">—</p>
                        <p className="text-xs text-gray-400 mt-1">TODO: Wire to database</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <p className="text-sm text-gray-500 mb-1">Open Tickets</p>
                        <p className="text-3xl font-bold text-gray-900">—</p>
                        <p className="text-xs text-gray-400 mt-1">TODO: Wire to database</p>
                    </div>
                </div>

                {/* Admin Actions */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link
                            href="/support"
                            className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                            <p className="font-medium text-gray-900">📋 Manage Tickets</p>
                            <p className="text-sm text-gray-500 mt-1">View and resolve support tickets</p>
                        </Link>
                        <Link
                            href="/courses"
                            className="block p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                        >
                            <p className="font-medium text-gray-900">📚 Manage Courses</p>
                            <p className="text-sm text-gray-500 mt-1">Edit courses and modules</p>
                        </Link>
                        <div className="p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                            <p className="font-medium text-gray-400">👤 User Management</p>
                            <p className="text-sm text-gray-400 mt-1">Coming soon</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
