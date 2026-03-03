'use client'
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "../db/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectGroupLabel,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "../ui/Select";
import { Ticket } from '../support/page';
import { useRouter } from "next/navigation";
import { safeRedirect } from "@/lib/security/redirect-validator";

export default function TicketSubmissionForm() {
    const router = useRouter();
    const [name, setName] = useState<string>('');
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    useEffect(() => {
        const checkLoggedIn = async () => {
            const { data: { session } } = await supabase().auth.getSession();
            if (!session) {
                router.push(safeRedirect('/auth'));
            } else {
                setEmail(session.user.email as string);
                setFirstName(session.user.user_metadata.first_name as string);
                setLastName(session.user.user_metadata.last_name as string);
                setPhone(session.user.user_metadata.phone as string);
                setEmail(session.user.email as string);
            }
        }
    }, [router]);

    const inputsSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Invalid email address"),
        phone: z.string().optional(),
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        course: z.string().min(1, "Course is required"),
    });

    type Inputs = z.infer<typeof inputsSchema>
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
    } = useForm<Inputs>({
        resolver: zodResolver(inputsSchema),
        defaultValues: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            title: "",
            description: "",
            course: "",
        }
    })
    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        await fetch('/api/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: data.title,
                description: data.description,
                firstName: data.firstName,
                lastName: data.lastName,
                course: data.course,
                email: data.email,
                phone: data.phone,
                status: 'open' as Ticket['status'],
                logs: '',
            }),
        });
        reset();
    }
    return (
        <form className="max-w-xl mx-auto bg-white shadow-md rounded-lg p-8 space-y-6">
            <h1 className="text-3xl font-bold text-center text-blue-600">Submit a New Ticket</h1>

            <div className="space-y-2">
                <label className="block font-semibold">Title:</label>
                <input
                    type="text"
                    placeholder="Enter ticket title"
                    {...register("title")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block font-semibold">Description:</label>
                <input
                    type="text"
                    placeholder="Describe your issue"
                    {...register("description")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block font-semibold">First Name:</label>
                <input
                    type="text"
                    placeholder="Your first name"
                    {...register("firstName")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block font-semibold">Last Name:</label>
                <input
                    type="text"
                    placeholder="Your last name"
                    {...register("lastName")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block font-semibold">Phone:</label>
                <input
                    type="text"
                    placeholder="Your phone number"
                    {...register("phone")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block font-semibold">Email:</label>
                <input
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block font-semibold">Course:</label>
                <Controller
                    control={control}
                    name="course"
                    render={({ field }) => (
                        <Select
                            {...field}
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Course" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="course-a">Course A</SelectItem>
                                <SelectItem value="course-b">Course B</SelectItem>
                                <SelectItem value="course-c">Course C</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.course && <p className="text-red-500 text-sm">{errors.course.message}</p>}
            </div>


            <button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
            >
                Add Ticket
            </button>
        </form>
    )
}
