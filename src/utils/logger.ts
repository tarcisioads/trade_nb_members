import winston from 'winston';
import * as path from 'path';

const transports: winston.transport[] = [
    new winston.transports.File({
        filename: path.join(process.cwd(), 'logs/trade_nb_members.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
    }),
    new winston.transports.File({
        filename: path.join(process.cwd(), 'logs/trade_nb_members-error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
    })
];

if (process.env.LOG_TO_CONSOLE === 'true') {
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    );
}

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports
});

transports.forEach((transport) => {
    if (transport instanceof winston.transports.File) {
        transport.on('error', (err: any) => {
            if (err.code === 'EBUSY' || err.code === 'EACCES') {
                // Arquivo está sendo usado por outro processo ou acesso negado
                // Loga no console para não perder o erro
                // Não lança para evitar crash
                // Você pode customizar aqui para alertar de outra forma se quiser
                // eslint-disable-next-line no-console
                console.error('[LOGGER] Falha ao gravar no arquivo de log:', err.message);
            } else {
                // Outros erros podem ser tratados normalmente
                // eslint-disable-next-line no-console
                console.error('[LOGGER] Erro inesperado no transporte de log:', err);
            }
        });
    }
}); 