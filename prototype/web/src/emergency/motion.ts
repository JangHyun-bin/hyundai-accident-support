import { spring } from 'motion'

// 앱 창 전체가 spring 하나로 움직인다. Motion 이 spring 을 CSS linear() 로 풀어 주므로 view transition 에도 같은 값을 쓴다.
// visualDuration 0.3초: UI 전환은 300ms 안에 도착한다. bounce 0.1: 긴급 화면이라 튕김은 거의 없게 한다.
const css = spring(0.3, 0.1).toString()
const cut = css.indexOf(' ')
document.documentElement.style.setProperty('--spring-duration', css.slice(0, cut))
document.documentElement.style.setProperty('--spring-easing', css.slice(cut + 1))
