-- ==============================================================================
-- COLLEGE DIGITAL MAGAZINE PLATFORM - SEED DATA
-- Module 01: Foundation, Database, Authentication & Access Control
-- ==============================================================================

-- 1. SEED DEPARTMENTS
INSERT INTO public.departments (id, name, short_name, slug, description, is_active)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'Computer Engineering',
        'COMP',
        'computer-engineering',
        'Innovations in computing, systems architecture, algorithms, and software development.',
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'Information Technology',
        'IT',
        'information-technology',
        'Information systems, cloud networks, cybersecurity, and enterprise computing.',
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Artificial Intelligence & Machine Learning',
        'AIML',
        'artificial-intelligence-machine-learning',
        'Frontiers in neural computation, deep learning, cognitive robotics, and intelligent systems.',
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'Electronics & Telecommunication',
        'EXTC',
        'electronics-telecommunication',
        'VLSI design, embedded signal processing, RF engineering, and IoT ecosystems.',
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        'Mechanical Engineering',
        'MECH',
        'mechanical-engineering',
        'Thermodynamics, robotics, precision manufacturing, and sustainable automotive engineering.',
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000006',
        'Civil Engineering',
        'CIVIL',
        'civil-engineering',
        'Structural integrity, smart cities, environmental sustainability, and urban infrastructure.',
        true
    )
ON CONFLICT (slug) DO UPDATE 
SET 
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Optional Note for Demo Magazines:
-- In production, demo users & profiles must first exist in auth.users.
-- Below is a template showing how demo magazine rows are structured once a profile exists:
/*
INSERT INTO public.magazines (
    id,
    slug,
    department_id,
    title,
    subtitle,
    description,
    academic_year,
    edition,
    volume,
    issue,
    cover_image_url,
    original_pdf_url,
    page_count,
    status,
    created_by,
    published_at
) VALUES (
    gen_random_uuid(),
    'technova-2026-vol-1',
    'a0000000-0000-0000-0000-000000000001',
    'TechNova: Frontiers of Computing',
    'Annual Research & Tech Editorial',
    'Showcasing groundbreaking student capstones, faculty research in distributed systems, and industry insights.',
    '2025-2026',
    'Annual Edition',
    'Vol. 14',
    'Issue 1',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
    NULL,
    48,
    'PUBLISHED',
    'TARGET_USER_PROFILE_UUID',
    now()
);
*/
