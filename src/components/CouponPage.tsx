'use client';

import React from 'react';

interface CouponData {
    title: string;
    subtitle: string;
    discount: string;
    description: string;
    color: string;
    accentColor: string;
    icon: string;
}

const coupons: CouponData[] = [
    // 3 coupons for hernias
    ...Array(3).fill({
        title: 'КУПОН НА КОНСУЛЬТАЦИЮ',
        subtitle: 'Лечение грыж позвоночника',
        discount: '50%',
        description: 'Предъявите данный купон при записи на консультацию по лечению грыж позвоночника',
        color: '#0d9488',
        accentColor: '#ccfbf1',
        icon: '🦴',
    }),
    // 2 coupons for arthrosis
    ...Array(2).fill({
        title: 'КУПОН НА КОНСУЛЬТАЦИЮ',
        subtitle: 'Лечение артроза суставов',
        discount: '50%',
        description: 'Предъявите данный купон при записи на консультацию по лечению артроза суставов',
        color: '#0369a1',
        accentColor: '#e0f2fe',
        icon: '🦵',
    }),
];

interface CouponPageProps {
    doctorName?: string;
    clinicName?: string;
    doctorPhone?: string;
    visitDate?: string;
}

export function CouponPage({ doctorName, clinicName, doctorPhone, visitDate }: CouponPageProps) {
    const formattedDate = visitDate || new Date().toLocaleDateString('ru-RU');

    return (
        <div
            className="hidden print:block"
            style={{
                pageBreakBefore: 'always',
                width: '100%',
                minHeight: '100vh',
                padding: '8mm 6mm',
                boxSizing: 'border-box',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
        >
            {coupons.map((coupon, idx) => (
                <React.Fragment key={idx}>
                    {/* Cut line between coupons */}
                    {idx > 0 && (
                        <div
                            style={{
                                borderTop: '1px dashed #9ca3af',
                                margin: '0 0',
                                position: 'relative',
                                height: '0',
                                opacity: 0.5,
                            }}
                        >
                            <span
                                style={{
                                    position: 'absolute',
                                    left: '-4mm',
                                    top: '-9px',
                                    fontSize: '16px',
                                    color: '#9ca3af',
                                }}
                            >
                                ✂
                            </span>
                        </div>
                    )}

                    {/* Coupon */}
                    <div
                        style={{
                            border: `1px solid ${coupon.color}40`,
                            borderRadius: '16px',
                            padding: '16px 24px',
                            margin: idx === 0 ? '0 0 6px 0' : '6px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '24px',
                            height: 'calc((100vh - 16mm - 60px) / 5 - 4px)',
                            boxSizing: 'border-box',
                            background: `linear-gradient(135deg, white 40%, ${coupon.accentColor}30 100%)`,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Decorative accent */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '6px',
                            height: '100%',
                            backgroundColor: coupon.color,
                        }} />

                        {/* Icon */}
                        <div
                            style={{
                                width: '64px',
                                height: '64px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
                                marginLeft: '8px',
                            }}
                        >
                            {/* Custom Spine Icon for Hernia */}
                            {coupon.subtitle.includes('грыж') ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={coupon.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '48px', height: '48px' }}>
                                    <path d="M12 5v14" />
                                    <path d="M8 9h8" />
                                    <path d="M8 13h8" />
                                    <path d="M8 17h8" />
                                    <path d="M9 5a3 3 0 1 1 6 0" />
                                </svg>
                            ) : (
                                <span style={{ fontSize: '48px', lineHeight: 1 }}>{coupon.icon}</span>
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    letterSpacing: '1.5px',
                                    color: coupon.color,
                                    textTransform: 'uppercase',
                                    marginBottom: '4px',
                                    opacity: 0.9,
                                }}
                            >
                                {coupon.title}
                            </div>
                            <div
                                style={{
                                    fontSize: '20px',
                                    fontWeight: 800,
                                    color: '#111827',
                                    marginBottom: '8px',
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {coupon.subtitle}
                            </div>
                            <div
                                style={{
                                    fontSize: '14px',
                                    color: '#1f2937',
                                    lineHeight: 1.4,
                                    marginBottom: '10px',
                                    fontWeight: 600,
                                }}
                            >
                                Купон на консультацию со скидкой.
                                <br />
                                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400 }}>Предъявите купон администратору.</span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginTop: 'auto',
                                    paddingTop: '8px',
                                    borderTop: '1px solid #e5e7eb',
                                    fontSize: '11px',
                                    color: '#6b7280',
                                    fontWeight: 500,
                                }}
                            >
                                {doctorName && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ opacity: 0.7 }}>Врач:</span>
                                        <span style={{ color: '#1f2937', fontWeight: 600 }}>{doctorName}</span>
                                    </span>
                                )}
                                {doctorPhone && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ opacity: 1, fontWeight: 700 }}>WhatsApp:</span>
                                        <span style={{ color: '#1f2937', fontWeight: 700 }}>{doctorPhone}</span>
                                    </span>
                                )}
                                <span style={{ marginLeft: 'auto', opacity: 0.7 }}>Дата: {formattedDate}</span>
                            </div>
                        </div>

                        {/* Discount badge */}
                        <div
                            style={{
                                flexShrink: 0,
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: coupon.color,
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                border: '4px solid white',
                                transform: 'rotate(-5deg)',
                            }}
                        >
                            <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.9, letterSpacing: '0.5px' }}>СКИДКА</div>
                            <div style={{ fontSize: '32px', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-1px' }}>{coupon.discount}</div>
                        </div>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}
