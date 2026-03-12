const postTitle: string = "My First Typescript Code";
const likeCount: number = 20;
const isTrending: boolean = true;
const summary: string = `The ${postTitle} post racked up ${likeCount} likes
.`;
console.log(summary);

function greetUser(name: string): string {
    return `Hello, ${name}!`;
}
function addLikes(likeCount: number, LikeCountTwo: number): number {
    return likeCount + LikeCountTwo;
}
function isPopular(likeCount: number): boolean {
    return likeCount > 10; //makes sense if it is greater than a certain number
}

const greeting: string = greetUser("John");
const totalLikes: number = addLikes(likeCount, 6);
const isPopulars: boolean = isPopular(likeCount);