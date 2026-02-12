export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  content: string;
}

export const posts: BlogPost[] = [
  {
    slug: "good-to-have-must-have",
    title: "Good To Have → Must Have",
    description:
      "만드는 사람한테 Must Have가 아니면, 그 서비스는 힘을 잃는다. 첫 번째 실패에서 배운 것.",
    date: "2026-02-10",
    content: `어제 처음으로 사람들에게 AI로 당일치기 MVP 서비스를 만들었다.

러닝 인증샷을 AI로 재밌게 바꿔줘볼까? 라는 거였는데
만들면서도 솔직히 느꼈다. 나조차 이거 없어도 된다는 거.

## Good To Have

있으면 한번 써보고, 없어도 그만.

그러다 보니 홍보할 때도 확신이 없었다.
커뮤니티에 올리면 정지당하고, 강퇴당하고.
그때마다 "사람들이 이걸 정말 좋아하려나?" 하는 생각뿐이었다.
도파민이 안 나왔다. 만드는 사람이 안 신나는데 누가 신나겠나.

결국 깨달은 게 하나 있다.
**만드는 본인한테 Must Have가 아니면 그 서비스는 힘을 잃는다.**

---

그래서 이번엔 다르게 만들어 보려고 한다.

나는 매일 뛴다. 뛰고 나면 애플워치 한 번 보고 끝이다.

더 잘 뛰고 싶은데 내 러닝이 저번주보다 나은 내가 되었는지, 심박이 왜 높았는지, 솔직히 모른다.
그냥 흘려보낸다.

한동안은 GPT한테 매번 물어봤다.
"오늘 10KM 뛰었고 페이스 5:30이고 심박수 162. 다음 훈련은 어떻게 짜?"
근데 이걸 매번 복붙하는 게 진짜 귀찮다.
지난주 기록이랑 비교하려면 또 찾아서 붙여넣고.

NRC, Strava, Runna 다 써봤는데 그다지 마음에 드는 건 없었다.
데이터는 쌓이는데 정작 "그래서 뭘 해야 하는데?"는 보기 쉽지 않았다.
심지어 외국 앱이라 한국어도 없다.

그래서 다시 랜딩페이지부터 만들고 있다.

## 같이 만들어가고 싶다

근데 혼자 만들면 내 불편함만 해결하잖아.
뛰는 사람마다 다 다른 고민이 있을 거라서
같이 이야기하면서 만들어가고 싶다.

오픈채팅방도 하나 만들었고
"이런 기능 있었으면 좋겠다"
"러닝 앱 쓰면서 이게 불편하다"

편하게 던져주면 내가 바로 만들어볼게!`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}
