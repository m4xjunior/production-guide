export interface Step {
  paso: number;
  tipo: 'VOZ' | 'SISTEMA';
  mensaje: string;
  voz: string;
  respuesta: string;
  fotos: string;
}

export const stepsData: Step[] = [
  {
    paso: 1,
    tipo: 'VOZ',
    mensaje: 'Colocar en motor (01565) 230v  Puntera hueca (01443) en el cable de Toma Tierra.      Comprobar que los terminales estan bien clipados.      Pasar cable del motor por el pasamuros triple. **  Se debe pasar por el agujero del  medio**',
    voz: 'Clipado y cable por pasamuros',
    respuesta: 'PIN BUENO',
    fotos: 'P1.png'
  },
  {
    paso: 2,
    tipo: 'VOZ',
    mensaje: 'Recoger el cable del motor alrededor de la caja de conexiones del motor, tal y como se ve en la foto. Se tiene que untar el eje el motor con grasa Molykote (10872).',
    voz: 'Grasa y montar eje',
    respuesta: 'PIN BUENO',
    fotos: 'P2.png'
  },
  {
    paso: 3,
    tipo: 'VOZ',
    mensaje: 'Comprobar con el util UC-203 el  correcto centrado de los motores.',
    voz: 'Comprobar centrado',
    respuesta: 'PIN BUENO',
    fotos: 'P3.png'
  },
  {
    paso: 4,
    tipo: 'VOZ',
    mensaje: 'Montar reductor sobre motor, encarando el hueco de la chaveta del reductor, con la chaveta del motor, Reductor (01595) Colocar los tornillos que vienen en una bolsita junto al reductor. Ver posición del reductor con respecto a la       Caja-Condesador del motor.',
    voz: 'Montar reductor',
    respuesta: 'PIN BUENO',
    fotos: 'P4.png'
  },
  {
    paso: 5,
    tipo: 'SISTEMA',
    mensaje: 'Descontar material: Reductor, Molykote (10872)',
    voz: 'N/A',
    respuesta: 'N/A',
    fotos: 'N/A'
  },
  {
    paso: 6,
    tipo: 'VOZ',
    mensaje: 'Montar reductor sobre motor, encarando el hueco de la chaveta del reductor, con la chaveta del motor, Reductor (01595) Colocar los tornillos que vienen en una bolsita junto al reductor. Ver posición del reductor con respecto a la       Caja-Condesador del motor.',
    voz: 'Colocar tornillos',
    respuesta: 'PIN BUENO',
    fotos: 'P4.png'
  },
  {
    paso: 7,
    tipo: 'SISTEMA',
    mensaje: 'Descontar material: Tornillo 912 M-8x40 (00088), Chaveta 8x7x40 (00324),Arandela piñon (02342) y Arandela 127 D8 (00297)',
    voz: 'N/A',
    respuesta: 'N/A',
    fotos: 'N/A'
  },
  {
    paso: 8,
    tipo: 'VOZ',
    mensaje: 'Soplar piñon del eje.Cuidado al soplar, separarselo del cuerpo, no acercarselo a la cara ya que el eje suele tener viruta y aceite.',
    voz: 'Soplar piñon',
    respuesta: 'PIN BUENO',
    fotos: 'P5.png'
  },
  {
    paso: 9,
    tipo: 'VOZ',
    mensaje: 'Montar  Eje Reductor Z-12 (04432)  Tornillo 912 M-8x40 (00088)   Chaveta 8x7x40 (00324) Arandela piñon (02342) Arandela 127 D8 (00297) Loctite 243',
    voz: 'Montar tornillo, chaveta y arandelas',
    respuesta: 'PIN BUENO',
    fotos: 'P6.png'
  },
  {
    paso: 10,
    tipo: 'VOZ',
    mensaje: 'No golpear el eje debe de entrar con la mano. Utilizar maquina neumatica y dar el ultimo apriete con Dinamometrica a 20Nm',
    voz: 'Apretar dinamométrica',
    respuesta: 'PIN BUENO',
    fotos: 'P7.png'
  },
  {
    paso: 11,
    tipo: 'VOZ',
    mensaje: 'Montar Tornillo 7991 8x30 (00147) x4 Arandela 9021 D8 (00309) x4 Arandela 127 D8 (00297) x4 Tuerca 934 M8 (00233) x4Brida y reductor han de quedar enrasados Loctite 243',
    voz: 'Montar tornillos, arandelas y tuerca',
    respuesta: 'PIN BUENO',
    fotos: 'P8.png'
  },
  {
    paso: 12,
    tipo: 'SISTEMA',
    mensaje: 'Descontar material:  Tornillo 7991 8x30 (00147) x4 Arandela 9021 D8 (00309) x4 Arandela 127 D8 (00297) x4 Tuerca 934 M8 (00233) x4',
    voz: 'N/A',
    respuesta: 'N/A',
    fotos: 'N/A'
  },
  {
    paso: 13,
    tipo: 'VOZ',
    mensaje: 'Montar Tornillo 7991 8x30 (00147) x4 Arandela 9021 D8 (00309) x4 Arandela 127 D8 (00297) x4 Tuerca 934 M8 (00233) x4Brida y reductor han de quedar enrasados Loctite 243',
    voz: 'Brida y reductor a nivel',
    respuesta: 'PIN BUENO',
    fotos: 'P8.png'
  },
  {
    paso: 14,
    tipo: 'VOZ',
    mensaje: 'Una vez finalizados, dejar los motores en el carro para su transporte. Identificar con una etiqueta de codigo de producto.',
    voz: 'Etiqueta y dejar en carro',
    respuesta: 'PIN BUENO',
    fotos: 'P9.png'
  },
  {
    paso: 15,
    tipo: 'SISTEMA',
    mensaje: 'Descontar material: brida, motor (01565) 230v , etiqueta.',
    voz: 'N/A',
    respuesta: 'N/A',
    fotos: 'N/A'
  }
];
