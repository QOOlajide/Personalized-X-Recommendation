function AppTitle() {
    return <h1>Shift-Personalized Recommendations</h1>;

}
function Tagline() {
    return <p>Take control of your feed. Shift is an open-source, X-style feed where the recommendation algorithm is fully exposed, explainable, and user-tunable—no black boxes, just sliders and signals you can inspect.</p>;
}
function Footer() {
    return <footer>Built with ❤️ by Quamzeen Olajide</footer>;
    //needs to match the component name
}
function LandingPage() {
    return <div>
    <AppTitle />
    <Tagline />
    <Footer />
    </div>;
    
}
function PostCard(title: string, likes: number) 