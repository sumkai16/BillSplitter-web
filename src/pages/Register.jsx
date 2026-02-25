import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
    const [form, setForm] = useState({
        firstName: '', lastName: '', nickname: '',
        username: '', email: '', password: '', confirmPassword: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const validate = () => {
        for (const [key, value] of Object.entries(form)) {
            if (!value || value.trim() === '') {
                return 'All fields are required. Spaces are not valid input.'
            }
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(form.email)) return 'Please enter a valid email address'
        if (form.password.length < 8 || form.password.length > 16) return 'Password must be 8-16 characters'
        if (!/[A-Z]/.test(form.password)) return 'Password must contain at least one uppercase letter'
        if (!/[a-z]/.test(form.password)) return 'Password must contain at least one lowercase letter'
        if (!/[0-9]/.test(form.password)) return 'Password must contain at least one number'
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) return 'Password must contain at least one special character'
        if (form.password !== form.confirmPassword) return 'Passwords do not match'
        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }
        setLoading(true)
        try {
            await signUp(form.email, form.password, {
                firstName: form.firstName,
                lastName: form.lastName,
                nickname: form.nickname,
                username: form.username,
            })
            navigate('/dashboard')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Create Account</h1>
                {error && <div style={styles.error}>{error}</div>}
                <form onSubmit={handleSubmit} >
                    <input style={styles.input} name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} />
                    <input style={styles.input} name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} />
                    <input style={styles.input} name="nickname" placeholder="Nickname" value={form.nickname} onChange={handleChange} />
                    <input style={styles.input} name="username" placeholder="Username" value={form.username} onChange={handleChange} />
                    <input style={styles.input} name="email" placeholder="Email" type="email" value={form.email} onChange={handleChange} />
                    <input style={styles.input} name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} />
                    <input style={styles.input} name="confirmPassword" placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={handleChange} />
                    <button style={styles.button} type="submit" disabled={loading}>
                        {loading ? 'Creating account...' : 'Register'}
                    </button>
                </form>
                <p style={styles.link}>Already have an account? <Link to="/login">Sign In</Link></p>
            </div>
        </div>
    )
}

const styles = {
    container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' },
    card: { backgroundColor: '#fff', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '420px', boxShadow: '0 4px 20px rgba(190, 190, 190, 0.08)' },
    title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center', color: '#1a1a2e' },
    error: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
    input: { width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#1a1a2e' },
    button: { width: '100%', padding: '14px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
    link: { textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#666' },
}