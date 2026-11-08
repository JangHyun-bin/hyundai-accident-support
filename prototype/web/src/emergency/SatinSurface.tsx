import { useEffect, useRef } from 'react'

export type SurfaceStatus = 'loading' | 'ready' | 'unavailable'

const vertex = `#version 300 es
in vec2 position;
out vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`

// C study의 sparse Gabor와 anisotropic sheen. 긴급 화면에서는 밝기와 적용 영역을 제한한다.
const fragment = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform float intensity;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.17,311.73))+19.89)*43758.5453);}
vec2 hash2(vec2 p){return vec2(hash(p),hash(p+vec2(43.71,17.31)));}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float a=.55,s=0.;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){s+=a*noise(p);p=r*p*2.07+vec2(13.9,7.1);a*=.48;}return s;}
float gabor(vec2 p){vec2 cell=floor(p);float sum=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 id=cell+vec2(x,y);vec2 h=hash2(id);vec2 d=p-id-h;float angle=(hash(id+14.6)-.5)*.38;vec2 direction=vec2(sin(angle),cos(angle));sum+=exp(-3.2*dot(d,d))*cos(2.*PI*((.65+1.1*hash(id+4.5))*dot(d,direction)+h.y));}return sum;}
void main(){
 vec2 p=vec2(uv.x,1.-uv.y),px=p*vec2(840.,1184.);
 float local=fbm(p*4.7);
 vec2 q=vec2(px.x*.11+(fbm(p*12.)-.5)*.6,px.y*.40+(local-.5)*1.2);
 float grain=gabor(q)*.7+gabor(q*vec2(.31,.46)+41.)*.3;
 float rise=smoothstep(.02,.88,p.y);
 vec3 steel=mix(vec3(.033,.042,.073),vec3(.21,.27,.36),rise);
 float theta=.186;vec2 d=p-vec2(.255,.58);
 mat2 rotation=mat2(cos(theta),-sin(theta),sin(theta),cos(theta));vec2 r=rotation*d;
 float roughness=.075+.025*local+.015*grain;
 float sheen=exp(-pow(r.x/roughness,2.)-pow(r.y/.67,2.));
 float shoulder=exp(-pow((r.x-.07)/.25,2.)-pow(r.y/.82,2.));
 float cut=exp(-pow((r.x+.12)/.11,2.)-pow(r.y/.9,2.));
 steel+=vec3(.12,.14,.18)*(sheen*.78+shoulder*.25);
 steel-=vec3(.04,.045,.05)*cut;
 steel+=grain*.021;
 // Text 영역의 최대 밝기를 제한하고, 상태에 따라 surface 색을 바꾸지 않는다.
 float actionShade=mix(1.,.39,smoothstep(.36,.56,p.x));
 float footerShade=mix(1.,.37,smoothstep(.73,.86,p.y));
 float edgeShade=.82+.18*sin(clamp(p.x,0.,1.)*PI);
 vec3 base=vec3(19.,20.,23.)/255.;
 vec3 material=steel*actionShade*footerShade*edgeShade;
 material=max(base*.72,material);
 material=min(material,vec3(.235,.25,.28));
 color=vec4(mix(base,material,intensity),1.);
}`

export function SatinSurface({ intensity, onStatus }: { intensity: number; onStatus: (status: SurfaceStatus) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const draw = useRef<((value: number) => void) | null>(null)

  useEffect(() => {
    const element = canvas.current!
    const gl = element.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true })
    if (!gl) { onStatus('unavailable'); return }
    const shaders: WebGLShader[] = []
    let program: WebGLProgram | null = null
    let buffer: WebGLBuffer | null = null
    const lost = (event: Event) => { event.preventDefault(); draw.current = null; onStatus('unavailable') }
    element.addEventListener('webglcontextlost', lost)
    const cleanup = () => {
      draw.current = null
      element.removeEventListener('webglcontextlost', lost)
      shaders.forEach(shader => gl.deleteShader(shader))
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)
        if (!shader) throw new Error('Shader unavailable')
        shaders.push(shader)
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed')
        return shader
      }
      program = gl.createProgram()
      if (!program) throw new Error('Program unavailable')
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link failed')
      gl.useProgram(program)
      buffer = gl.createBuffer()
      if (!buffer) throw new Error('Buffer unavailable')
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      const amount = gl.getUniformLocation(program, 'intensity')
      gl.viewport(0, 0, element.width, element.height)
      draw.current = value => {
        gl.uniform1f(amount, value / 100)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        onStatus(gl.getError() === gl.NO_ERROR ? 'ready' : 'unavailable')
      }
    } catch { cleanup(); onStatus('unavailable') }
    return cleanup
  }, [onStatus])

  useEffect(() => { draw.current?.(intensity) }, [intensity])

  return <canvas ref={canvas} className="emergency-satin-surface" width={840} height={1184} aria-hidden="true" />
}
