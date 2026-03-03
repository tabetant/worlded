'use client';
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { supabase } from "../db/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { safeRedirect } from "@/lib/security/redirect-validator";

export default function LoginForm() {
    const router = useRouter();

    const inputsSchema = z.object({
        email: z.email({ message: "Invalid email address" }),
    });
    type Inputs = z.infer<typeof inputsSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<Inputs>({
        resolver: zodResolver(inputsSchema),
        defaultValues: {
            email: '',
        }
    })

    const onSubmit: SubmitHandler<Inputs> = async (formData) => {
        const { error: loginError } = await supabase().auth.signInWithOtp({
            email: formData.email,
        })
        if (loginError) {
            console.error("Error logging in:", loginError);
            return;
        }
        router.push(safeRedirect('/dashboard'));
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <h1 className='text-4xl my-2 text-center'>Login</h1>
            <div>
                <label>Email:</label>
                <input className='mx-2' placeholder='Enter email address' type="email" {...register("email")} />
                {errors.email && <p>{errors.email.message}</p>}
            </div>
            <div className='flex flex-col items-center justify-center gap-2'>
                <button type="submit">Login</button>
            </div>
        </form>
    );
}
