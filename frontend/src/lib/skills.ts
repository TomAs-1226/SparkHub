export function parseSkillsInput(value?: string | null): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
        .filter((skill, index, arr) => arr.indexOf(skill) === index);
}
